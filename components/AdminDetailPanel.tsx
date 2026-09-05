"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { getBlocksForMonth } from "@/lib/calendar";
import {
  activityReportPath,
  findNote,
  isPrintedAssignment,
  noteId,
  parseDateKey,
  scheduledBlock,
  TEAM_OPTIONS,
  teamLabel,
  toDateKey,
  type ActivityMember,
  type ActivityNote,
  type ActivityReportImage,
} from "@/lib/activity-notes";
import {
  contiguousAssignmentDays,
  durationFieldsForDate,
  eachDateKey,
  MAX_DURATION_DAYS,
  resolveDuration,
} from "@/lib/assignment-duration";
import { DAY_NAMES, MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { baseActivityMembers, personInitials } from "@/lib/team-roster";
import type { BlockTeam } from "@/lib/types";
import { notifyActivityNotesChanged, useActivityNotes } from "./ActivityNotesProvider";
import { TeamAvatar } from "./TeamAvatar";

type AdminDetailPanelProps = {
  viewYear: number;
  viewMonth: number;
  selectedDay: number | null;
  open: boolean;
  onClose: () => void;
};

type FormState = {
  location: string;
  event: string;
  activity: string;
  remarks: string;
  reportImages: ActivityReportImage[];
  durationStart: string;
  durationEnd: string;
};

type TeamRow = {
  team: BlockTeam;
  printed: boolean;
  hidden: boolean;
};

const EMPTY_FORM: FormState = {
  location: "",
  event: "",
  activity: "",
  remarks: "",
  reportImages: [],
  durationStart: "",
  durationEnd: "",
};

function formatDurationLabel(start: string, end: string) {
  const from = parseDateKey(start);
  const to = parseDateKey(end);
  if (!from || !to) return "";
  const fromText = `${MONTH_NAMES[from.monthIndex].slice(0, 3)} ${from.day}`;
  if (start === end) return fromText;
  if (from.monthIndex === to.monthIndex && from.year === to.year) {
    return `${fromText}–${to.day}`;
  }
  return `${fromText} – ${MONTH_NAMES[to.monthIndex].slice(0, 3)} ${to.day}`;
}

const SPECIAL_META = {
  label: "Special Event",
  chipSolid: "chip-special-solid",
  photoClass: "photo-special",
  color: "var(--special)",
};

function blockTeamMeta(team: BlockTeam) {
  return team === "special" ? SPECIAL_META : TEAM_META[team];
}

function getTeamsForDate(dateKey: string, year: number, month: number, notes: ActivityNote[]): TeamRow[] {
  const parsed = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parsed) return [];
  const day = Number(parsed[3]);
  const rows: TeamRow[] = [];
  const seen = new Set<BlockTeam>();

  for (const block of getBlocksForMonth(year, month)) {
    if (day < block.start || day > block.end) continue;
    if (seen.has(block.team)) continue;
    const note = findNote(notes, dateKey, block.team);
    if (note?.hidden) continue;
    rows.push({ team: block.team, printed: true, hidden: false });
    seen.add(block.team);
  }

  for (const note of notes) {
    if (note.date !== dateKey || note.hidden || seen.has(note.team)) continue;
    rows.push({ team: note.team, printed: false, hidden: false });
    seen.add(note.team);
  }

  return rows.sort((a, b) => a.team.localeCompare(b.team));
}

function loadForm(dateKey: string, team: BlockTeam, notes: ActivityNote[]): FormState {
  const existing = findNote(notes, dateKey, team);
  const printed = scheduledBlock(dateKey, team);
  const duration = durationFieldsForDate(dateKey, team, notes);
  return {
    location: existing ? existing.location : printed?.place || printed?.event || "",
    event: existing ? (existing.event ?? "") : printed?.event || "",
    activity: existing?.activity ?? "",
    remarks: existing?.remarks ?? "",
    reportImages: existing?.reportImages ?? [],
    durationStart: duration.durationStart,
    durationEnd: duration.durationEnd,
  };
}

function membersForNote(team: BlockTeam, note?: ActivityNote) {
  if (note?.members?.length) return note.members.map((member) => ({ ...member }));
  return baseActivityMembers(team);
}

type DeleteActionsProps = {
  id: string;
  label: string;
  confirmId: string | null;
  deletingId: string | null;
  onConfirm: (id: string) => void;
  onRequest: (id: string) => void;
  onCancel: () => void;
};

function DeleteActions({ id, label, confirmId, deletingId, onConfirm, onRequest, onCancel }: DeleteActionsProps) {
  const pending = confirmId === id;
  if (pending) {
    return (
      <span className="admin-delete-wrap">
        <button type="button" className="admin-btn admin-btn-danger is-confirm" disabled={Boolean(deletingId)} onClick={() => onConfirm(id)}>
          {deletingId === id ? "Removing…" : "Yes, remove"}
        </button>
        <button type="button" className="admin-btn admin-btn-muted" disabled={Boolean(deletingId)} onClick={onCancel}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button type="button" className="admin-btn admin-btn-danger" disabled={Boolean(deletingId)} onClick={() => onRequest(id)}>
      {label}
    </button>
  );
}

export function AdminDetailPanel({ viewYear, viewMonth, selectedDay, open, onClose }: AdminDetailPanelProps) {
  const { notes, refresh, replaceNotes } = useActivityNotes();
  const [selectedTeam, setSelectedTeam] = useState<BlockTeam>("usec");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewMode, setViewMode] = useState<"edit" | "composition">("edit");
  const [composition, setComposition] = useState<ActivityMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberTitle, setNewMemberTitle] = useState("Team Member");
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState(false);
  const [removeConfirmTeam, setRemoveConfirmTeam] = useState<BlockTeam | null>(null);

  const dateKey = selectedDay ? toDateKey(viewYear, viewMonth, selectedDay) : "";
  const teamRows = useMemo(
    () => (dateKey ? getTeamsForDate(dateKey, viewYear, viewMonth, notes) : []),
    [dateKey, viewMonth, viewYear, notes],
  );
  const displayRows = useMemo(() => {
    if (!pendingAdd || teamRows.some((row) => row.team === selectedTeam)) return teamRows;
    return [...teamRows, { team: selectedTeam, printed: false, hidden: false }].sort((a, b) =>
      a.team.localeCompare(b.team),
    );
  }, [pendingAdd, selectedTeam, teamRows]);
  const selectedNote = dateKey ? findNote(notes, dateKey, selectedTeam) : undefined;
  const printed = dateKey ? scheduledBlock(dateKey, selectedTeam) : undefined;
  const resolvedDuration = dateKey ? resolveDuration(form.durationStart, form.durationEnd, dateKey) : null;
  const durationDates = resolvedDuration ? eachDateKey(resolvedDuration.start, resolvedDuration.end) : [];
  const durationLabel = resolvedDuration ? formatDurationLabel(resolvedDuration.start, resolvedDuration.end) : "";
  const availableTeams = TEAM_OPTIONS.filter((option) => !displayRows.some((row) => row.team === option.value));
  const usingCustomComposition = Boolean(selectedNote?.members?.length);

  useEffect(() => {
    if (!selectedDay) return;
    const key = toDateKey(viewYear, viewMonth, selectedDay);
    const rows = getTeamsForDate(key, viewYear, viewMonth, notes);
    const first = rows[0]?.team ?? "usec";
    setSelectedTeam(first);
    setForm(loadForm(key, first, notes));
    setViewMode("edit");
    setComposition(membersForNote(first, findNote(notes, key, first)));
    setNewMemberName("");
    setNewMemberTitle("Team Member");
    setStatus("");
    setStatusError(false);
    setConfirmId(null);
    setPendingAdd(false);
    setRemoveConfirmTeam(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, viewYear, viewMonth]);

  useEffect(() => {
    if (!dateKey) return;
    const id = noteId(dateKey, selectedTeam);
    let cancelled = false;
    void fetch(`/api/activity-notes/images?id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data: { images?: ActivityReportImage[] }) => {
        if (cancelled || !Array.isArray(data.images)) return;
        setForm((current) => ({ ...current, reportImages: data.images ?? [] }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dateKey, selectedTeam]);

  function selectTeam(team: BlockTeam, options?: { pending?: boolean; notes?: ActivityNote[] }) {
    if (!dateKey) return;
    const source = options?.notes ?? notes;
    setSelectedTeam(team);
    setPendingAdd(Boolean(options?.pending));
    setForm(loadForm(dateKey, team, source));
    setViewMode("edit");
    setComposition(membersForNote(team, findNote(source, dateKey, team)));
    setStatus("");
    setStatusError(false);
    setConfirmId(null);
    setRemoveConfirmTeam(null);
  }

  function requestRemoveTeam(team: BlockTeam) {
    if (!dateKey) return;
    if (!teamRows.some((row) => row.team === team)) {
      const fallback = teamRows[0]?.team ?? TEAM_OPTIONS.find((option) => option.value !== team)?.value ?? "usec";
      selectTeam(fallback);
      return;
    }
    if (selectedTeam !== team) {
      selectTeam(team);
    }
    setRemoveConfirmTeam(team);
  }

  async function confirmRemoveTeam(team: BlockTeam) {
    if (!dateKey) return;
    const printedBlock = scheduledBlock(dateKey, team);
    const note = findNote(notes, dateKey, team);
    setDeletingId(noteId(dateKey, team));
    setStatus("");
    setStatusError(false);
    try {
      let nextNotes: ActivityNote[] | undefined;
      if (printedBlock) {
        nextNotes = await saveEntry({
          date: dateKey,
          team,
          location: note?.location ?? printedBlock.place ?? printedBlock.event ?? "",
          activity: note?.activity ?? "",
          remarks: note?.remarks ?? "",
          reportImages: note?.reportImages,
          event: note?.event ?? printedBlock.event ?? "",
          hidden: true,
          members: note?.members,
        });
      } else if (note) {
        const response = await fetch("/api/activity-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id: note.id }),
        });
        const data = (await response.json().catch(() => ({}))) as { notes?: ActivityNote[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Could not remove this team.");
        }
        nextNotes = data.notes;
      }

      if (nextNotes) {
        replaceNotes(nextNotes);
      } else {
        await refresh();
        nextNotes = notes;
      }
      notifyActivityNotesChanged();
      const remaining = getTeamsForDate(dateKey, viewYear, viewMonth, nextNotes);
      const nextTeam =
        remaining.find((row) => row.team !== team)?.team ??
        remaining[0]?.team ??
        TEAM_OPTIONS.find((option) => option.value !== team)?.value ??
        "usec";
      selectTeam(nextTeam, { notes: nextNotes });
      setStatus(`Removed ${teamLabel(team)} from this date.`);
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not remove this team.");
    } finally {
      setDeletingId(null);
    }
  }

  async function onUploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!dateKey || !files.length) return;
    setUploading(true);
    setStatus("");
    setStatusError(false);
    try {
      let latestImages = form.reportImages;
      for (const file of files) {
        const body = new FormData();
        body.append("date", dateKey);
        body.append("team", selectedTeam);
        body.append("file", file);
        const response = await fetch("/api/activity-notes/images", { method: "POST", body });
        const data = (await response.json().catch(() => ({}))) as {
          image?: ActivityReportImage;
          notes?: ActivityNote[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Could not upload this photo.");
        }
        if (data.notes) replaceNotes(data.notes);
        if (data.image) {
          latestImages = [...latestImages.filter((image) => image.path !== data.image?.path), data.image];
          setForm((current) => ({
            ...current,
            reportImages: [...current.reportImages.filter((image) => image.path !== data.image?.path), data.image!],
          }));
        }
      }
      notifyActivityNotesChanged();
      setStatusError(false);
      setStatus(latestImages.length ? "Photo uploaded to Supabase. Save the report text when you are done." : "Photo uploaded.");
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not upload this photo.");
    } finally {
      setUploading(false);
    }
  }

  async function onRemovePhoto(image: ActivityReportImage) {
    if (!dateKey) return;
    setUploading(true);
    setStatus("");
    setStatusError(false);
    try {
      const id = noteId(dateKey, selectedTeam);
      const response = await fetch(
        `/api/activity-notes/images?id=${encodeURIComponent(id)}&path=${encodeURIComponent(image.path)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        images?: ActivityReportImage[];
        notes?: ActivityNote[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not remove this photo.");
      }
      if (data.notes) replaceNotes(data.notes);
      setForm((current) => ({
        ...current,
        reportImages: data.images ?? current.reportImages.filter((item) => item.path !== image.path),
      }));
      notifyActivityNotesChanged();
      setStatus("Photo removed.");
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not remove this photo.");
    } finally {
      setUploading(false);
    }
  }

  function openComposition() {
    setComposition(membersForNote(selectedTeam, selectedNote));
    setNewMemberName("");
    setNewMemberTitle("Team Member");
    setViewMode("composition");
    setStatus("");
    setStatusError(false);
  }

  async function saveEntry(payload: {
    date: string;
    team: BlockTeam;
    location: string;
    activity: string;
    remarks: string;
    reportImages?: ActivityReportImage[] | null;
    event: string;
    hidden?: boolean;
    members?: ActivityMember[] | null;
  }) {
    const response = await fetch("/api/activity-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      notes?: ActivityNote[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || "Could not save this entry.");
    }
    if (data.notes) {
      replaceNotes(data.notes);
    }
    return data.notes;
  }

  async function deleteEntry(id: string) {
    const response = await fetch("/api/activity-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = (await response.json().catch(() => ({}))) as { notes?: ActivityNote[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not remove this entry.");
    }
    if (data.notes) replaceNotes(data.notes);
    return data.notes;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dateKey) return;
    const span = resolveDuration(form.durationStart, form.durationEnd, dateKey);
    const keepDates = eachDateKey(span.start, span.end);
    if (!keepDates.length) {
      setStatusError(true);
      setStatus("Enter a valid duration, or leave it blank to use this date.");
      return;
    }
    if (keepDates.length > MAX_DURATION_DAYS) {
      setStatusError(true);
      setStatus(`Duration can be at most ${MAX_DURATION_DAYS} days.`);
      return;
    }

    setSaving(true);
    setStatus("");
    setStatusError(false);
    try {
      const eventValue = selectedTeam === "special" ? form.event || form.location : form.event;
      let latestNotes: ActivityNote[] = notes;
      const parsed = parseDateKey(dateKey);
      const oldDays = parsed
        ? contiguousAssignmentDays(parsed.year, parsed.monthIndex, parsed.day, selectedTeam, notes)
        : [selectedDay ?? 0];
      const oldDates = parsed
        ? oldDays.map((day) => toDateKey(parsed.year, parsed.monthIndex, day))
        : [dateKey];
      const keep = new Set(keepDates);

      for (const date of keepDates) {
        const saved = await saveEntry({
          date,
          team: selectedTeam,
          location: form.location,
          activity: form.activity,
          remarks: form.remarks,
          reportImages: form.reportImages,
          event: eventValue,
          hidden: false,
        });
        if (saved) latestNotes = saved;
      }

      for (const date of oldDates) {
        if (keep.has(date)) continue;
        const existing = findNote(latestNotes, date, selectedTeam);
        if (isPrintedAssignment(date, selectedTeam)) {
          const block = scheduledBlock(date, selectedTeam);
          const saved = await saveEntry({
            date,
            team: selectedTeam,
            location: existing?.location ?? block?.place ?? block?.event ?? form.location,
            activity: existing?.activity ?? "",
            remarks: existing?.remarks ?? "",
            reportImages: existing?.reportImages,
            event: existing?.event ?? block?.event ?? "",
            hidden: true,
            members: existing?.members,
          });
          if (saved) latestNotes = saved;
        } else if (existing) {
          const saved = await deleteEntry(existing.id);
          if (saved) latestNotes = saved;
        }
      }

      notifyActivityNotesChanged();
      setPendingAdd(false);
      setForm((current) => ({ ...current, durationStart: span.start, durationEnd: span.end }));
      setStatusError(false);
      setStatus(
        keepDates.length === 1
          ? `Saved for ${formatDurationLabel(span.start, span.end)}. The public dashboard will update now.`
          : `Saved for ${formatDurationLabel(span.start, span.end)} (${keepDates.length} days). The public dashboard will update now.`,
      );
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function saveComposition() {
    if (!dateKey) return;
    setSaving(true);
    setStatus("");
    setStatusError(false);
    try {
      const eventValue = selectedTeam === "special" ? form.event || form.location : form.event;
      const cleaned = composition
        .map((member) => ({
          ...member,
          name: member.name.trim(),
          title: member.title?.trim() || undefined,
        }))
        .filter((member) => member.name);
      const latestNotes = await saveEntry({
        date: dateKey,
        team: selectedTeam,
        location: form.location,
        activity: form.activity,
        remarks: form.remarks,
        reportImages: form.reportImages,
        event: eventValue,
        hidden: false,
        members: cleaned.length ? cleaned : null,
      });
      const saved = (latestNotes ?? []).find((note) => note.date === dateKey && note.team === selectedTeam);
      if (cleaned.length && !saved?.members?.length) {
        throw new Error("Team composition did not save to the dashboard. Please try again.");
      }
      notifyActivityNotesChanged();
      setStatusError(false);
      setStatus("Team composition saved for this date only. The original team roster is unchanged.");
      setViewMode("edit");
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function addMember() {
    const name = newMemberName.trim();
    if (!name) return;
    setComposition((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        name,
        title: newMemberTitle.trim() || "Team Member",
      },
    ]);
    setNewMemberName("");
    setNewMemberTitle("Team Member");
  }

  function removeMember(id: string) {
    setComposition((current) => current.filter((member) => member.id !== id));
  }

  function resetComposition() {
    setComposition(baseActivityMembers(selectedTeam));
  }

  async function onDelete(id: string) {
    const existing = notes.find((note) => note.id === id);
    const parsed = id.split("__");
    const printedRow = isPrintedAssignment(parsed[0] ?? "", (parsed[1] as BlockTeam) ?? "usec");
    setDeletingId(id);
    setStatus("");
    setStatusError(false);
    try {
      const response = await fetch("/api/activity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = (await response.json().catch(() => ({}))) as { notes?: ActivityNote[]; error?: string };
      if (!response.ok) {
        setStatusError(true);
        setStatus(data.error || "Could not remove this entry.");
        return;
      }
      if (data.notes) {
        replaceNotes(data.notes);
      } else {
        await refresh();
      }
      notifyActivityNotesChanged();
      setConfirmId(null);
      const nextNotes = data.notes;
      if (nextNotes && dateKey) {
        const remaining = getTeamsForDate(dateKey, viewYear, viewMonth, nextNotes);
        if (!remaining.some((row) => row.team === selectedTeam)) {
          const nextTeam = remaining[0]?.team ?? TEAM_OPTIONS.find((option) => option.value !== selectedTeam)?.value ?? "usec";
          selectTeam(nextTeam, { notes: nextNotes });
        }
      }
      setStatusError(false);
      setStatus(
        existing
          ? "Removed your added data."
          : printedRow
            ? "Hidden from the public dashboard. Save again to restore."
            : "Removed from the dashboard.",
      );
    } catch {
      setStatusError(true);
      setStatus("Could not reach the server.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!selectedDay) {
    return (
      <aside className={`detail-panel admin-detail-panel${open ? " open" : ""}`}>
        <div className="empty-icon">✏️</div>
        <h3 style={{ margin: 0 }}>Select a date</h3>
        <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: 260, margin: 0 }}>
          Click any date on the calendar to view and edit team assignments, activities, and the Activity Report/MOM.
        </p>
      </aside>
    );
  }

  const dow = new Date(viewYear, viewMonth, selectedDay).getDay();
  const meta = blockTeamMeta(selectedTeam);
  const currentRow = teamRows.find((row) => row.team === selectedTeam);
  const entryId = noteId(dateKey, selectedTeam);

  if (viewMode === "composition") {
    return (
      <aside className={`detail-panel admin-detail-panel${open ? " open" : ""}`}>
        <div className="drag-handle" />
        <div className="detail-header">
          <div>
            <div className="detail-date-big">
              {MONTH_NAMES[viewMonth].slice(0, 3)} {selectedDay}
            </div>
            <div className="detail-date-sub">
              {DAY_NAMES[dow]} · {viewYear} · {teamLabel(selectedTeam)}
            </div>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </div>

        <div className="admin-composition">
          <button type="button" className="admin-back-btn" onClick={() => setViewMode("edit")}>
            ← Back to activity
          </button>

          <h3 className="admin-composition-title">Team composition</h3>
          <p className="admin-hint">
            Edit who is assigned for this date only. The original {teamLabel(selectedTeam)} roster stays the same.
          </p>

          <ul className="admin-member-list">
            {composition.length ? (
              composition.map((member) => (
                <li key={member.id} className="admin-member-row">
                  {member.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photo} alt="" className="admin-member-photo" />
                  ) : (
                    <span className="admin-member-fallback">{personInitials(member.name)}</span>
                  )}
                  <div className="admin-member-meta">
                    <strong>{member.name}</strong>
                    <span>{member.title || "Team Member"}</span>
                  </div>
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeMember(member.id)}>
                    Remove
                  </button>
                </li>
              ))
            ) : (
              <li className="admin-member-empty">No members assigned for this activity yet.</li>
            )}
          </ul>

          <div className="admin-member-add">
            <label className="admin-field">
              <span>Add member</span>
              <input
                type="text"
                className="admin-field-input"
                placeholder="Full name"
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Title</span>
              <input
                type="text"
                className="admin-field-input"
                placeholder="Team Member"
                value={newMemberTitle}
                onChange={(event) => setNewMemberTitle(event.target.value)}
              />
            </label>
            <button type="button" className="admin-btn admin-btn-muted" onClick={addMember} disabled={!newMemberName.trim()}>
              Add to this activity
            </button>
          </div>

          <div className="admin-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void saveComposition()}>
              {saving ? "Saving…" : "Save composition"}
            </button>
            {selectedTeam !== "special" ? (
              <button type="button" className="admin-btn admin-btn-muted" disabled={saving} onClick={resetComposition}>
                Reset to original team
              </button>
            ) : null}
          </div>
          {status ? <p className={`admin-status${statusError ? " is-error" : ""}`}>{status}</p> : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className={`detail-panel admin-detail-panel${open ? " open" : ""}`}>
      <div className="drag-handle" />
      <div className="detail-header">
        <div>
          <div className="detail-date-big">
            {MONTH_NAMES[viewMonth].slice(0, 3)} {selectedDay}
          </div>
          <div className="detail-date-sub">
            {DAY_NAMES[dow]} · {viewYear}
          </div>
        </div>
        <button className="close-btn" type="button" onClick={onClose} aria-label="Close editor">
          ✕
        </button>
      </div>

      <div className="admin-team-tabs">
        {displayRows.map((row) => {
          const rowMeta = blockTeamMeta(row.team);
          return (
            <div
              key={row.team}
              className={`admin-team-tab${selectedTeam === row.team ? " is-active" : ""}${row.hidden ? " is-hidden" : ""}`}
            >
              <button type="button" className="admin-team-tab-select" onClick={() => selectTeam(row.team)}>
                <span className="dot-sm" style={{ background: rowMeta.color }} />
                {teamLabel(row.team)}
              </button>
              <button
                type="button"
                className="admin-team-tab-remove"
                aria-label={`Remove ${teamLabel(row.team)}`}
                title={`Remove ${teamLabel(row.team)}`}
                disabled={Boolean(deletingId)}
                onClick={() => requestRemoveTeam(row.team)}
              >
                ×
              </button>
            </div>
          );
        })}
        {availableTeams.length ? (
          <select
            className="admin-team-add"
            value=""
            onChange={(event) => {
              const team = event.target.value as BlockTeam;
              if (team) selectTeam(team, { pending: true });
            }}
          >
            <option value="">+ Add team</option>
            {availableTeams.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {displayRows.length ? (
          <select
            className="admin-team-add admin-team-remove"
            value=""
            disabled={Boolean(deletingId)}
            onChange={(event) => {
              const team = event.target.value as BlockTeam;
              if (team) requestRemoveTeam(team);
            }}
          >
            <option value="">− Remove team</option>
            {displayRows.map((row) => (
              <option key={row.team} value={row.team}>
                {teamLabel(row.team)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {removeConfirmTeam ? (
        <div className="admin-remove-confirm">
          <p>Remove {teamLabel(removeConfirmTeam)} from this date?</p>
          <span className="admin-delete-wrap">
            <button
              type="button"
              className="admin-btn admin-btn-danger is-confirm"
              disabled={Boolean(deletingId)}
              onClick={() => void confirmRemoveTeam(removeConfirmTeam)}
            >
              {deletingId ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-muted"
              disabled={Boolean(deletingId)}
              onClick={() => setRemoveConfirmTeam(null)}
            >
              Cancel
            </button>
          </span>
        </div>
      ) : null}

      {!teamRows.length && !pendingAdd && availableTeams.length ? (
        <div className="admin-empty-day">
          <p>No assignments on this date yet.</p>
          <select
            className="admin-field-input"
            value={selectedTeam}
            onChange={(event) => selectTeam(event.target.value as BlockTeam, { pending: true })}
          >
            {availableTeams.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <form className="admin-edit-form" onSubmit={onSubmit}>
        <div className={`team-card admin-team-card${selectedTeam === "special" ? " is-special" : ""}`}>
          <div className={`team-photo ${meta.photoClass}`}>
            <div className="overlay" />
            <div>
              <div className="pin" style={{ textAlign: "center" }}>
                📍
              </div>
              <div className="loc-text">{form.location || "Set location"}</div>
            </div>
          </div>
          <div className="team-body">
            <div className="team-name-row">
              <button
                type="button"
                className={`team-chip admin-team-chip-btn ${meta.chipSolid}`}
                style={selectedTeam === "special" ? { background: "var(--special)" } : undefined}
                onClick={openComposition}
                title="Edit team composition for this date"
              >
                {meta.label}
              </button>
              {selectedTeam !== "special" ? (
                <button type="button" className="admin-avatar-btn" onClick={openComposition} title="Edit team composition">
                  <TeamAvatar teamKey={selectedTeam} size={36} />
                </button>
              ) : (
                <button type="button" className="admin-avatar-btn" onClick={openComposition} title="Edit team composition">
                  <span className="admin-special-star">★</span>
                </button>
              )}
            </div>
            <button type="button" className="admin-composition-link" onClick={openComposition}>
              {usingCustomComposition
                ? `Custom composition · ${selectedNote?.members?.length ?? 0} members · Edit`
                : "Edit team composition for this date"}
            </button>

            {selectedNote?.hidden ? (
              <p className="admin-hint warn">This assignment is hidden. Saving will restore it to the public dashboard.</p>
            ) : printed ? (
              <p className="admin-hint">
                {currentRow?.printed
                  ? `Editing the printed schedule for ${teamLabel(selectedTeam)}.`
                  : `Editing ${teamLabel(selectedTeam)} on this date.`}
              </p>
            ) : (
              <p className="admin-hint warn">New activity — saving will add it to the calendar, activity log, and map.</p>
            )}

            <label className="admin-field">
              <span>Location</span>
              <input
                type="text"
                className="admin-field-input"
                placeholder="City, municipality, or site"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
            </label>

            <div className="admin-duration">
              <label className="admin-field">
                <span>Duration start</span>
                <input
                  type="date"
                  className="admin-field-input"
                  value={form.durationStart}
                  onChange={(event) => setForm((current) => ({ ...current, durationStart: event.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>Duration end</span>
                <input
                  type="date"
                  className="admin-field-input"
                  value={form.durationEnd}
                  onChange={(event) => setForm((current) => ({ ...current, durationEnd: event.target.value }))}
                />
              </label>
            </div>
            <p className="admin-hint">
              {durationDates.length > MAX_DURATION_DAYS
                ? `Duration can be at most ${MAX_DURATION_DAYS} days.`
                : !form.durationStart && !form.durationEnd
                  ? `Leave blank to use ${MONTH_NAMES[viewMonth].slice(0, 3)} ${selectedDay} only.`
                  : durationDates.length === 1
                    ? `This assignment will cover ${durationLabel}.`
                    : `This assignment will cover ${durationLabel} (${durationDates.length} days).`}
            </p>

            <label className="admin-field">
              <span>Event / title</span>
              <input
                type="text"
                className="admin-field-input"
                placeholder={selectedTeam === "special" ? "Special event name" : "Optional event line"}
                value={form.event}
                onChange={(event) => setForm((current) => ({ ...current, event: event.target.value }))}
              />
            </label>

            <label className="admin-field">
              <span>Activity</span>
              <textarea
                className="admin-field-input"
                rows={3}
                placeholder="What did the team do?"
                value={form.activity}
                onChange={(event) => setForm((current) => ({ ...current, activity: event.target.value }))}
              />
            </label>

            <label className="admin-field">
              <span>Activity Report/MOM</span>
              <textarea
                className="admin-field-input admin-report-input"
                rows={8}
                placeholder="Minutes of meeting, findings, and activity report"
                value={form.remarks}
                onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              />
            </label>

            <div className="admin-field">
              <span>Report photos</span>
              {form.reportImages.length ? (
                <ul className="admin-photo-grid">
                  {form.reportImages.map((image) => (
                    <li key={image.path} className="admin-photo-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} />
                      <button
                        type="button"
                        className="admin-photo-remove"
                        disabled={uploading || saving}
                        onClick={() => void onRemovePhoto(image)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-photo-empty">No photos yet. Upload pictures to show them on the Activity Report/MOM page.</p>
              )}
              <label className="admin-upload-btn">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading || saving} onChange={(event) => void onUploadPhotos(event)} />
                {uploading ? "Uploading…" : "Upload photos"}
              </label>
              <a className="admin-report-open" href={activityReportPath(dateKey, selectedTeam)} target="_blank" rel="noreferrer">
                Open Activity Report/MOM page
              </a>
            </div>

            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={saving || uploading || Boolean(deletingId)}>
                {saving ? "Saving…" : selectedNote?.hidden ? "Restore to dashboard" : "Save to dashboard"}
              </button>
              {printed || selectedNote ? (
                <DeleteActions
                  id={entryId}
                  label={selectedNote ? "Remove added data" : printed ? "Hide from dashboard" : "Remove"}
                  confirmId={confirmId}
                  deletingId={deletingId}
                  onConfirm={(id) => void onDelete(id)}
                  onRequest={setConfirmId}
                  onCancel={() => setConfirmId(null)}
                />
              ) : null}
            </div>
            {status ? <p className={`admin-status${statusError ? " is-error" : ""}`}>{status}</p> : null}
          </div>
        </div>
      </form>
    </aside>
  );
}

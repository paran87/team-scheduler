"use client";

import { useEffect, useMemo, useState } from "react";
import { getBlocksForMonth } from "@/lib/calendar";
import {
  findNote,
  isPrintedAssignment,
  noteId,
  scheduledBlock,
  TEAM_OPTIONS,
  teamLabel,
  toDateKey,
  type ActivityNote,
} from "@/lib/activity-notes";
import { DAY_NAMES, MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
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
  applyRange: boolean;
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
  applyRange: false,
};

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
    const note = findNote(notes, dateKey, block.team);
    rows.push({ team: block.team, printed: true, hidden: Boolean(note?.hidden) });
    seen.add(block.team);
  }

  for (const note of notes) {
    if (note.date !== dateKey || seen.has(note.team)) continue;
    rows.push({ team: note.team, printed: false, hidden: Boolean(note.hidden) });
    seen.add(note.team);
  }

  return rows.sort((a, b) => a.team.localeCompare(b.team));
}

function loadForm(dateKey: string, team: BlockTeam, notes: ActivityNote[]): FormState {
  const existing = findNote(notes, dateKey, team);
  const printed = scheduledBlock(dateKey, team);
  return {
    location: existing ? existing.location : printed?.place || printed?.event || "",
    event: existing ? (existing.event ?? "") : printed?.event || "",
    activity: existing?.activity ?? "",
    remarks: existing?.remarks ?? "",
    applyRange: Boolean(printed && printed.start !== printed.end),
  };
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
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const dateKey = selectedDay ? toDateKey(viewYear, viewMonth, selectedDay) : "";
  const teamRows = useMemo(
    () => (dateKey ? getTeamsForDate(dateKey, viewYear, viewMonth, notes) : []),
    [dateKey, viewMonth, viewYear, notes],
  );
  const selectedNote = dateKey ? findNote(notes, dateKey, selectedTeam) : undefined;
  const printed = dateKey ? scheduledBlock(dateKey, selectedTeam) : undefined;
  const rangeDays = printed && printed.start !== printed.end ? printed.end - printed.start + 1 : 1;

  const availableTeams = TEAM_OPTIONS.filter((option) => !teamRows.some((row) => row.team === option.value));

  useEffect(() => {
    if (!selectedDay) return;
    const key = toDateKey(viewYear, viewMonth, selectedDay);
    const rows = getTeamsForDate(key, viewYear, viewMonth, notes);
    const first = rows[0]?.team ?? "usec";
    setSelectedTeam(first);
    setForm(loadForm(key, first, notes));
    setStatus("");
    setStatusError(false);
    setConfirmId(null);
    // Reset only when the selected calendar day/month changes, not on every notes poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, viewYear, viewMonth]);

  function selectTeam(team: BlockTeam) {
    if (!dateKey) return;
    setSelectedTeam(team);
    setForm(loadForm(dateKey, team, notes));
    setStatus("");
    setStatusError(false);
    setConfirmId(null);
  }

  async function saveEntry(payload: {
    date: string;
    team: BlockTeam;
    location: string;
    activity: string;
    remarks: string;
    event: string;
    hidden?: boolean;
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

  function datesToSave() {
    if (!dateKey || !form.applyRange || !printed) return [dateKey];
    const dates: string[] = [];
    for (let day = printed.start; day <= printed.end; day++) {
      dates.push(toDateKey(viewYear, viewMonth, day));
    }
    return dates;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dateKey) return;
    setSaving(true);
    setStatus("");
    setStatusError(false);
    try {
      const eventValue = selectedTeam === "special" ? form.event || form.location : form.event;
      let latestNotes: ActivityNote[] | undefined;
      for (const date of datesToSave()) {
        latestNotes = await saveEntry({
          date,
          team: selectedTeam,
          location: form.location,
          activity: form.activity,
          remarks: form.remarks,
          event: eventValue,
          hidden: false,
        });
      }
      if (!latestNotes) {
        await refresh();
      }
      notifyActivityNotesChanged();
      setStatusError(false);
      setStatus("Saved. The public dashboard will update now.");
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
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
          Click any date on the calendar to view and edit team assignments, activities, and remarks.
        </p>
      </aside>
    );
  }

  const dow = new Date(viewYear, viewMonth, selectedDay).getDay();
  const meta = blockTeamMeta(selectedTeam);
  const currentRow = teamRows.find((row) => row.team === selectedTeam);
  const entryId = noteId(dateKey, selectedTeam);

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
        {teamRows.map((row) => {
          const rowMeta = blockTeamMeta(row.team);
          return (
            <button
              key={row.team}
              type="button"
              className={`admin-team-tab${selectedTeam === row.team ? " is-active" : ""}${row.hidden ? " is-hidden" : ""}`}
              onClick={() => selectTeam(row.team)}
            >
              <span className="dot-sm" style={{ background: rowMeta.color }} />
              {teamLabel(row.team)}
              {row.hidden ? " (hidden)" : ""}
            </button>
          );
        })}
        {availableTeams.length ? (
          <select
            className="admin-team-add"
            value=""
            onChange={(event) => {
              const team = event.target.value as BlockTeam;
              if (team) selectTeam(team);
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
      </div>

      {!teamRows.length && availableTeams.length ? (
        <div className="admin-empty-day">
          <p>No assignments on this date yet.</p>
          <select
            className="admin-field-input"
            value={selectedTeam}
            onChange={(event) => selectTeam(event.target.value as BlockTeam)}
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
              <span className={`team-chip ${meta.chipSolid}`} style={selectedTeam === "special" ? { background: "var(--special)" } : undefined}>
                {meta.label}
              </span>
              {selectedTeam !== "special" ? <TeamAvatar teamKey={selectedTeam} size={36} /> : <span className="admin-special-star">★</span>}
            </div>

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
              <span>Remarks</span>
              <textarea
                className="admin-field-input"
                rows={2}
                placeholder="Notes or follow-ups"
                value={form.remarks}
                onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              />
            </label>

            {rangeDays > 1 && printed ? (
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.applyRange}
                  onChange={(event) => setForm((current) => ({ ...current, applyRange: event.target.checked }))}
                />
                Apply to full assignment ({MONTH_NAMES[viewMonth].slice(0, 3)} {printed.start}–{printed.end})
              </label>
            ) : null}

            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={saving || Boolean(deletingId)}>
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

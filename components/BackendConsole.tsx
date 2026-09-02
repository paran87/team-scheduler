"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { notifyActivityNotesChanged } from "./ActivityNotesProvider";
import { getBlocksForMonth } from "@/lib/calendar";
import {
  findNote,
  isPrintedAssignment,
  noteId,
  parseDateKey,
  scheduledBlock,
  TEAM_OPTIONS,
  teamLabel,
  toDateKey,
  type ActivityNote,
} from "@/lib/activity-notes";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import type { BlockTeam } from "@/lib/types";

type FormState = {
  date: string;
  team: BlockTeam;
  location: string;
  event: string;
  activity: string;
  remarks: string;
  applyRange: boolean;
};

const DEFAULT_FORM: FormState = {
  date: "2026-09-02",
  team: "usec",
  location: "Lingayen, San Jacinto",
  event: "",
  activity: "",
  remarks: "",
  applyRange: false,
};

export function BackendConsole() {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [monitorMonth] = useState({ year: 2026, month: 8 });

  async function refresh() {
    const response = await fetch("/api/activity-notes", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notes?: ActivityNote[] };
    const next = data.notes ?? [];
    setNotes((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  function applyDateTeam(date: string, team: BlockTeam) {
    const existing = findNote(notes, date, team);
    const printed = scheduledBlock(date, team);
    setForm({
      date,
      team,
      location: existing?.location || printed?.place || printed?.event || "",
      event: existing?.event || printed?.event || "",
      activity: existing?.activity ?? "",
      remarks: existing?.remarks ?? "",
      applyRange: false,
    });
    setStatus("");
    setConfirmId(null);
  }

  const parsed = parseDateKey(form.date);
  const printed = scheduledBlock(form.date, form.team);
  const selectedNote = findNote(notes, form.date, form.team);
  const rangeDays = printed && printed.start !== printed.end ? printed.end - printed.start + 1 : 1;
  const teamIsScheduled = Boolean(printed) && !selectedNote?.hidden;

  const monitorRows = useMemo(() => {
    const { year, month } = monitorMonth;
    const rows: Array<{
      date: string;
      team: BlockTeam;
      place: string;
      event: string;
      activity: string;
      remarks: string;
      hidden: boolean;
      printed: boolean;
    }> = [];
    const seen = new Set<string>();

    for (const block of getBlocksForMonth(year, month)) {
      for (let day = block.start; day <= block.end; day++) {
        const date = toDateKey(year, month, day);
        const key = `${date}__${block.team}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const note = findNote(notes, date, block.team);
        rows.push({
          date,
          team: block.team,
          place: note?.location || block.place || block.event || "—",
          event: note?.event || block.event || "",
          activity: note?.activity ?? "",
          remarks: note?.remarks ?? "",
          hidden: Boolean(note?.hidden),
          printed: true,
        });
      }
    }

    for (const note of notes) {
      const key = `${note.date}__${note.team}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        date: note.date,
        team: note.team,
        place: note.location || "—",
        event: note.event || "",
        activity: note.activity,
        remarks: note.remarks,
        hidden: Boolean(note.hidden),
        printed: false,
      });
    }

    return rows.sort((a, b) => (a.date === b.date ? a.team.localeCompare(b.team) : a.date.localeCompare(b.date)));
  }, [monitorMonth, notes]);

  const editedCount = monitorRows.filter((row) => findNote(notes, row.date, row.team) && !row.hidden).length;
  const visibleCount = monitorRows.filter((row) => !row.hidden).length;

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
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not save this entry.");
    }
  }

  function datesToSave() {
    if (!form.applyRange || !printed || !parsed) return [form.date];
    const dates: string[] = [];
    for (let day = printed.start; day <= printed.end; day++) {
      dates.push(toDateKey(parsed.year, parsed.monthIndex, day));
    }
    return dates;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const eventValue = form.team === "special" ? form.event || form.location : form.event;
      for (const date of datesToSave()) {
        await saveEntry({
          date,
          team: form.team,
          location: form.location,
          activity: form.activity,
          remarks: form.remarks,
          event: eventValue,
          hidden: false,
        });
      }
      notifyActivityNotesChanged();
      await refresh();
      setStatus("Saved. The public calendar, Activity tab, and map will update now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(id: string) {
    setConfirmId(id);
    setStatus("");
  }

  async function onDelete(id: string) {
    const existing = notes.find((note) => note.id === id);
    const parsed = id.split("__");
    const printedRow = isPrintedAssignment(parsed[0] ?? "", (parsed[1] as BlockTeam) ?? "usec");
    setDeletingId(id);
    setStatus("");
    try {
      const response = await fetch("/api/activity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = (await response.json().catch(() => ({}))) as { notes?: ActivityNote[]; error?: string };
      if (!response.ok) {
        setStatus(data.error || "Could not remove this entry.");
        return;
      }
      setNotes(data.notes ?? []);
      notifyActivityNotesChanged();
      setConfirmId(null);
      setStatus(
        existing
          ? "Removed your added data. The public calendar, Activity tab, and map will update now."
          : printedRow
            ? "Hidden from the public dashboard. Save again to restore it."
            : "Removed. The public calendar, Activity tab, and map will update now.",
      );
    } catch {
      setStatus("Could not reach the server.");
    } finally {
      setDeletingId(null);
    }
  }

  async function onRestore(row: { date: string; team: BlockTeam; place: string; event: string; activity: string; remarks: string }) {
    setSaving(true);
    setStatus("");
    try {
      await saveEntry({
        date: row.date,
        team: row.team,
        location: row.place === "—" ? "" : row.place,
        activity: row.activity,
        remarks: row.remarks,
        event: row.event,
        hidden: false,
      });
      notifyActivityNotesChanged();
      await refresh();
      setStatus("Restored to the public dashboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function DeleteButton({ id, label }: { id: string; label: string }) {
    const pending = confirmId === id;
    return (
      <span className="backend-delete-wrap">
        {pending ? (
          <>
            <button
              type="button"
              className="backend-delete is-confirm"
              disabled={Boolean(deletingId)}
              onClick={() => void onDelete(id)}
            >
              {deletingId === id ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              className="backend-delete-cancel"
              disabled={Boolean(deletingId)}
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="backend-delete"
            disabled={Boolean(deletingId)}
            onClick={() => requestDelete(id)}
          >
            {label}
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="backend-page">
      <header className="backend-header">
        <div className="backend-header-inner">
          <div className="brand-block">
            <BrandLogo />
            <div>
              <p className="brand-title">Admin Console</p>
              <p className="brand-sub">Edit the September schedule and update the public dashboard</p>
            </div>
          </div>
          <Link href="/" className="backend-dash-link">
            View public dashboard →
          </Link>
        </div>
      </header>

      <main className="backend-main">
        <section className="backend-stats">
          <article className="backend-stat">
            <span>September assignments</span>
            <strong>{monitorRows.filter((row) => row.date.startsWith("2026-09")).length}</strong>
          </article>
          <article className="backend-stat">
            <span>Visible on dashboard</span>
            <strong>
              {visibleCount}/{monitorRows.length}
            </strong>
          </article>
          <article className="backend-stat">
            <span>Edited from admin</span>
            <strong>{editedCount}</strong>
          </article>
        </section>

        <div className="backend-grid">
          <form id="backend-form" className="backend-card backend-form" onSubmit={onSubmit}>
            <h2>Edit assignment</h2>
            <p>
              Every September date, team, location, event, activity, and remarks can be changed here.
              Click a row in the September table to load it.
            </p>

            <label className="backend-field">
              Date
              <input
                type="date"
                required
                value={form.date}
                onChange={(event) => applyDateTeam(event.target.value, form.team)}
              />
            </label>

            <label className="backend-field">
              Team
              <select
                value={form.team}
                onChange={(event) => applyDateTeam(form.date, event.target.value as BlockTeam)}
              >
                {TEAM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={`backend-hint${teamIsScheduled || selectedNote?.hidden ? "" : " warn"}`}>
              {selectedNote?.hidden
                ? `${teamLabel(form.team)} is hidden on this date. Saving will put it back on the public dashboard.`
                : printed
                  ? `You are editing the September schedule for ${teamLabel(form.team)}${
                      printed.start === printed.end
                        ? ""
                        : ` (${MONTH_NAMES[monitorMonth.month].slice(0, 3)} ${printed.start}–${printed.end})`
                    }. Saving updates the public calendar, Activity tab, and map.`
                  : `${teamLabel(form.team)} is not on this date yet. Saving will create a new activity, timeline card, and map label.`}
            </div>

            <label className="backend-field">
              Location
              <input
                type="text"
                placeholder="City, municipality, or site"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
            </label>

            <label className="backend-field">
              Event / title
              <input
                type="text"
                placeholder={form.team === "special" ? "Special event name" : "Optional event line, e.g. With Asec Jojo"}
                value={form.event}
                onChange={(event) => setForm((current) => ({ ...current, event: event.target.value }))}
              />
            </label>

            <label className="backend-field">
              Activity
              <textarea
                rows={3}
                placeholder="What did the team do?"
                value={form.activity}
                onChange={(event) => setForm((current) => ({ ...current, activity: event.target.value }))}
              />
            </label>

            <label className="backend-field">
              Remarks
              <textarea
                rows={3}
                placeholder="Notes, follow-ups, or other remarks"
                value={form.remarks}
                onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              />
            </label>

            {rangeDays > 1 && printed ? (
              <label className="backend-check">
                <input
                  type="checkbox"
                  checked={form.applyRange}
                  onChange={(event) => setForm((current) => ({ ...current, applyRange: event.target.checked }))}
                />
                Also update the other {rangeDays - 1} day{rangeDays - 1 === 1 ? "" : "s"} in this assignment (
                {MONTH_NAMES[monitorMonth.month].slice(0, 3)} {printed.start}–{printed.end})
              </label>
            ) : null}

            <div className="backend-actions">
              <button className="backend-submit" type="submit" disabled={saving || Boolean(deletingId)}>
                {saving ? "Saving…" : selectedNote?.hidden ? "Restore to dashboard" : "Save to dashboard"}
              </button>
              {printed || selectedNote ? (
                <DeleteButton
                  id={noteId(form.date, form.team)}
                  label={
                    selectedNote
                      ? "Remove added data"
                      : printed
                        ? "Hide from dashboard"
                        : "Remove from dashboard"
                  }
                />
              ) : null}
            </div>
            {status ? <p className="backend-status">{status}</p> : null}
          </form>

          <section className="backend-card">
            <h2>September schedule</h2>
            <p>
              All printed {MONTH_NAMES[monitorMonth.month]} {monitorMonth.year} assignments are editable.
              Click a row to load it into the form.
            </p>
            <div className="backend-table-wrap">
              <table className="backend-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Team</th>
                    <th>Location</th>
                    <th>activity</th>
                    <th>remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {monitorRows.map((row) => (
                    <tr
                      key={`${row.date}-${row.team}`}
                      className={`${row.date === form.date && row.team === form.team ? "is-selected" : ""} is-editable${row.hidden ? " is-hidden" : ""}`}
                      onClick={() => applyDateTeam(row.date, row.team)}
                    >
                      <td>{row.date}</td>
                      <td>
                        <span
                          className="backend-team"
                          style={{
                            background:
                              row.team === "special" ? "var(--special)" : TEAM_META[row.team].color,
                          }}
                        >
                          {teamLabel(row.team)}
                        </span>
                      </td>
                      <td className={row.hidden ? "is-muted" : ""}>
                        {row.place}
                        {row.event && row.event !== row.place ? ` · ${row.event}` : ""}
                        {row.hidden ? " (hidden)" : ""}
                      </td>
                      <td>{row.activity || "—"}</td>
                      <td>{row.remarks || "—"}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="backend-edit"
                          onClick={() => {
                            applyDateTeam(row.date, row.team);
                            document.getElementById("backend-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          Edit
                        </button>
                        {row.hidden ? (
                          <button
                            type="button"
                            className="backend-restore"
                            disabled={saving}
                            onClick={() => void onRestore(row)}
                          >
                            Restore
                          </button>
                        ) : (
                          <DeleteButton
                            id={noteId(row.date, row.team)}
                            label={findNote(notes, row.date, row.team) ? "Remove added data" : "Hide"}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="backend-card">
          <h2>Saved changes</h2>
          {notes.length ? (
            <ul className="backend-log-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <div>
                    <strong>
                      {note.date} · {teamLabel(note.team)}
                      {note.hidden ? " · hidden" : ""}
                    </strong>
                    <p>location: {note.location || "—"}</p>
                    {note.event ? <p>event: {note.event}</p> : null}
                    <p>activity: {note.activity || "—"}</p>
                    <p>remarks: {note.remarks || "—"}</p>
                  </div>
                  {note.hidden ? (
                    <button
                      type="button"
                      className="backend-restore"
                      disabled={saving}
                      onClick={() =>
                        void onRestore({
                          date: note.date,
                          team: note.team,
                          place: note.location,
                          event: note.event || "",
                          activity: note.activity,
                          remarks: note.remarks,
                        })
                      }
                    >
                      Restore
                    </button>
                  ) : (
                    <DeleteButton id={note.id} label="Remove" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="backend-empty">No September edits have been saved yet. Click a row above to start.</p>
          )}
        </section>
      </main>
    </div>
  );
}

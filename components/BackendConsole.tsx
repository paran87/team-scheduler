"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { notifyActivityNotesChanged } from "./ActivityNotesProvider";
import { buildVisibleDayMap, getVisibleBlocks } from "@/lib/schedule-merge";
import {
  findNote,
  parseDateKey,
  scheduledLocation,
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
  activity: string;
  remarks: string;
};

const DEFAULT_FORM: FormState = {
  date: "2026-09-02",
  team: "usec",
  location: "Lingayen, San Jacinto",
  activity: "",
  remarks: "",
};

export function BackendConsole() {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [monitorMonth] = useState({ year: 2026, month: 8 });

  async function refresh() {
    const response = await fetch("/api/activity-notes", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notes?: ActivityNote[] };
    setNotes(data.notes ?? []);
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
    setForm({
      date,
      team,
      location: existing?.location || scheduledLocation(date, team),
      activity: existing?.activity ?? "",
      remarks: existing?.remarks ?? "",
    });
  }

  const parsed = parseDateKey(form.date);
  const scheduledForDate = parsed
    ? (buildVisibleDayMap(parsed.year, parsed.monthIndex, notes)[parsed.day] ?? [])
    : [];
  const teamIsScheduled = scheduledForDate.some((entry) => entry.team === form.team);

  const monitorRows = useMemo(() => {
    const { year, month } = monitorMonth;
    const blocks = getVisibleBlocks(year, month, notes);
    const rows: Array<{
      date: string;
      team: BlockTeam;
      place: string;
      onCalendar: boolean;
      activity: string;
      remarks: string;
    }> = [];
    const seen = new Set<string>();

    for (const block of blocks) {
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
          onCalendar: true,
          activity: note?.activity ?? "",
          remarks: note?.remarks ?? "",
        });
      }
    }

    for (const note of notes) {
      const key = `${note.date}__${note.team}`;
      if (seen.has(key)) continue;
      rows.push({
        date: note.date,
        team: note.team,
        place: note.location || "Not on public calendar",
        onCalendar: false,
        activity: note.activity,
        remarks: note.remarks,
      });
    }

    return rows.sort((a, b) => (a.date === b.date ? a.team.localeCompare(b.team) : a.date.localeCompare(b.date)));
  }, [monitorMonth, notes]);

  const filledCount = monitorRows.filter((row) => row.activity || row.remarks).length;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/activity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Could not save this entry.");
        return;
      }
      notifyActivityNotesChanged();
      await refresh();
      setStatus("Saved. The public calendar, Activity tab, and map will update now.");
    } catch {
      setStatus("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/activity-notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return;
    notifyActivityNotesChanged();
    await refresh();
  }

  return (
    <div className="backend-page">
      <header className="backend-header">
        <div className="backend-header-inner">
          <div className="brand-block">
            <BrandLogo />
            <div>
              <p className="brand-title">Admin Console</p>
              <p className="brand-sub">Log activity and monitor the public Team Schedule Dashboard</p>
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
            <span>Logged entries</span>
            <strong>{notes.length}</strong>
          </article>
          <article className="backend-stat">
            <span>On frontend this month</span>
            <strong>
              {filledCount}/{monitorRows.filter((row) => row.onCalendar).length}
            </strong>
          </article>
          <article className="backend-stat">
            <span>Selected date</span>
            <strong>{scheduledForDate.length} team{scheduledForDate.length === 1 ? "" : "s"}</strong>
          </article>
        </section>

        <div className="backend-grid">
          <form className="backend-card backend-form" onSubmit={onSubmit}>
            <h2>Activity form</h2>
            <p>
              New dates, teams, locations, and remarks appear immediately on the public calendar,
              Activity tab, and Show Map.
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

            <div className={`backend-hint${teamIsScheduled ? "" : " warn"}`}>
              {teamIsScheduled
                ? `On the public dashboard, ${teamLabel(form.team)} is already scheduled this date. Saving will update that activity.`
                : `${teamLabel(form.team)} is not on the calendar yet. Saving will create a new activity, timeline card, and map label.`}
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

            <button className="backend-submit" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save to dashboard"}
            </button>
            {status ? <p className="backend-status">{status}</p> : null}
          </form>

          <section className="backend-card">
            <h2>Frontend monitor</h2>
            <p>
              Live view of {MONTH_NAMES[monitorMonth.month]} {monitorMonth.year} as shown on the public
              dashboard, with activity and remarks from this console.
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
                  </tr>
                </thead>
                <tbody>
                  {monitorRows.map((row) => (
                    <tr
                      key={`${row.date}-${row.team}`}
                      className={row.date === form.date && row.team === form.team ? "is-selected" : ""}
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
                      <td className={row.onCalendar ? "" : "is-muted"}>{row.place}</td>
                      <td>{row.activity || "—"}</td>
                      <td>{row.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="backend-card">
          <h2>Saved logs</h2>
          {notes.length ? (
            <ul className="backend-log-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <div>
                    <strong>
                      {note.date} · {teamLabel(note.team)}
                    </strong>
                    <p>location: {note.location || "—"}</p>
                    <p>activity: {note.activity || "—"}</p>
                    <p>remarks: {note.remarks || "—"}</p>
                  </div>
                  <button type="button" className="backend-delete" onClick={() => void onDelete(note.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="backend-empty">No activity or remarks have been logged yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { findNote, teamLabel, toDateKey } from "@/lib/activity-notes";
import { TEAM_META, MONTH_NAMES } from "@/lib/schedule-data";
import { buildVisibleDayMap } from "@/lib/schedule-merge";
import type { BlockTeam, ScheduleBlock } from "@/lib/types";
import { useActivityNotes } from "./ActivityNotesProvider";
import { countAssignedPersonnel } from "./DayCompositionView";

type ActivityStatus = "Ongoing" | "Upcoming" | "Completed";

type TodayRow = {
  key: string;
  time: string;
  minutes: number | null;
  activity: string;
  location: string;
  team: BlockTeam;
  status: ActivityStatus;
};

type OverviewDashboardProps = {
  onOpenTodayActivities: () => void;
  onOpenTodayPersonnel: () => void;
};

const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i;
const LINE_TIME_RE = /(?:^|\n)\s*(Morning|Afternoon|Evening|\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[—\-–:]\s*(.+)/gi;

function toMinutes(hour: number, minute: number, meridiem: string) {
  let h = hour % 12;
  if (meridiem.toUpperCase() === "PM") h += 12;
  return h * 60 + minute;
}

function parseClock(label: string): number | null {
  const match = TIME_RE.exec(label.trim());
  if (!match) return null;
  return toMinutes(Number(match[1]), Number(match[2] ?? "0"), match[3]);
}

function statusForMinutes(minutes: number | null, nowMinutes: number): ActivityStatus {
  if (minutes == null) {
    if (nowMinutes < 12 * 60) return "Ongoing";
    return "Completed";
  }
  if (nowMinutes < minutes) return "Upcoming";
  if (nowMinutes < minutes + 120) return "Ongoing";
  return "Completed";
}

function rowsFromBlock(block: ScheduleBlock, nowMinutes: number, index: number): TodayRow[] {
  const location = block.place || block.event || "—";
  const text = (block.activity || block.event || block.place || "Scheduled deployment").trim();
  const lines = [...text.matchAll(LINE_TIME_RE)];

  if (lines.length) {
    return lines.map((match, lineIndex) => {
      const timeLabel = match[1].trim();
      const activity = match[2].trim();
      const minutes = parseClock(timeLabel);
      return {
        key: `${block.team}-${block.start}-${index}-${lineIndex}`,
        time: TIME_RE.test(timeLabel) ? timeLabel.replace(/\s+/g, " ").toUpperCase().replace(/AM|PM/, (m) => m) : timeLabel,
        minutes,
        activity,
        location,
        team: block.team,
        status: statusForMinutes(minutes, nowMinutes),
      };
    });
  }

  return [
    {
      key: `${block.team}-${block.start}-${index}`,
      time: "All day",
      minutes: null,
      activity: text.split("\n")[0] || "Scheduled deployment",
      location,
      team: block.team,
      status: statusForMinutes(null, nowMinutes),
    },
  ];
}

function formatClockLabel(label: string) {
  const match = TIME_RE.exec(label.trim());
  if (!match) return label;
  const hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const meridiem = match[3].toUpperCase();
  return `${hour}:${minute} ${meridiem}`;
}

export function OverviewDashboard({ onOpenTodayActivities, onOpenTodayPersonnel }: OverviewDashboardProps) {
  const { notes, loading } = useActivityNotes();
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const dateKey = toDateKey(year, month, day);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const todayBlocks = useMemo(() => {
    const map = buildVisibleDayMap(year, month, notes);
    return map[day] ?? [];
  }, [year, month, day, notes]);

  const rows = useMemo(() => {
    const next = todayBlocks.flatMap((block, index) => rowsFromBlock(block, nowMinutes, index));
    return next
      .map((row) => ({
        ...row,
        time: row.time === "All day" ? row.time : formatClockLabel(row.time),
      }))
      .sort((a, b) => {
        if (a.minutes == null && b.minutes == null) return a.team.localeCompare(b.team);
        if (a.minutes == null) return 1;
        if (b.minutes == null) return -1;
        return a.minutes - b.minutes;
      });
  }, [todayBlocks, nowMinutes]);

  const activeCount = todayBlocks.length;
  const personnel = countAssignedPersonnel(todayBlocks, dateKey, notes);

  const stats = [
    {
      id: "activities",
      icon: "🟢",
      label: "Active Activities",
      value: activeCount,
      onClick: onOpenTodayActivities,
    },
    {
      id: "personnel",
      icon: "👥",
      label: "Personnel Assigned",
      value: personnel,
      onClick: onOpenTodayPersonnel,
    },
  ] as const;

  return (
    <div className="overview-dashboard">
      <div className="section-heading">
        <h2>Today&apos;s Overview</h2>
        <p>
          {MONTH_NAMES[month]} {day}, {year} · Live summary from the current schedule
        </p>
      </div>

      <div className="overview-stats">
        {stats.map((stat) => (
          <button key={stat.id} type="button" className="overview-stat is-clickable" onClick={stat.onClick}>
            <span className="overview-stat-icon" aria-hidden>
              {stat.icon}
            </span>
            <div>
                  <strong>{loading ? "…" : stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </button>
        ))}
      </div>

      <section className="overview-table-card" id="todays-activities">
        <div className="section-heading overview-table-heading">
          <h2>Today&apos;s Activities</h2>
          <p>Timed deployments and meetings for today.</p>
        </div>

        {rows.length ? (
          <div className="overview-table-wrap">
            <table className="overview-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Activity</th>
                  <th>Location</th>
                  <th>Team</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = row.team === "special" ? null : TEAM_META[row.team];
                  const note = findNote(notes, dateKey, row.team);
                  return (
                    <tr key={row.key}>
                      <td className="overview-time">{row.time}</td>
                      <td>{row.activity}</td>
                      <td>{row.location || note?.location || "—"}</td>
                      <td>
                        <span
                          className="overview-team"
                          style={{ background: meta?.color ?? "var(--special)" }}
                        >
                          {teamLabel(row.team)}
                        </span>
                      </td>
                      <td>
                        <span className={`overview-status is-${row.status.toLowerCase()}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel overview-empty">
            <span className="emoji">🌤️</span>
            No activities scheduled for today.
          </div>
        )}
      </section>
    </div>
  );
}

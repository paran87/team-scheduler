"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { findNote, teamLabel, toDateKey } from "@/lib/activity-notes";
import { dotColor, shiftMonth } from "@/lib/calendar";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { DAY_NAMES, MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { buildVisibleDayMap, getVisibleBlocks } from "@/lib/schedule-merge";
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

type WeekDay = {
  key: string;
  date: Date;
  teams: BlockTeam[];
  isToday: boolean;
  inMonth: boolean;
};

type OverviewDashboardProps = {
  onOpenTodayActivities: () => void;
  onOpenTodayPersonnel: () => void;
  onOpenDay: (date: Date) => void;
  onOpenReports: () => void;
};

const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i;
const LINE_TIME_RE = /(?:^|\n)\s*(Morning|Afternoon|Evening|\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[—\-–:]\s*(.+)/gi;
const MS_PER_DAY = 86_400_000;

const STAT_ICONS: Record<string, ReactNode> = {
  activities: <path d="M13 2.5 4.8 13.4h6.1l-1 8.1 8.3-10.9h-6.1z" />,
  personnel: (
    <>
      <circle cx="9" cy="7.5" r="3.6" />
      <path d="M2.5 19.5v-1a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v1" />
      <path d="M16.4 4.4a3.6 3.6 0 0 1 0 6.6" />
      <path d="M17.5 14.2a4.5 4.5 0 0 1 4 4.3v1" />
    </>
  ),
  teams: (
    <>
      <path d="M12 2.6 4.6 5.8v6.1c0 4.4 3 7.9 7.4 9.1 4.4-1.2 7.4-4.7 7.4-9.1V5.8z" />
      <path d="m8.9 11.9 2.3 2.3 4.1-4.4" />
    </>
  ),
  reports: (
    <>
      <path d="M5.2 19.8V5.4A1.6 1.6 0 0 1 6.8 3.8h7.4l4.6 4.6v11.4a1.6 1.6 0 0 1-1.6 1.6H6.8a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="M14 3.9v4.7h4.7" />
      <path d="m9 14.6 2 2 3.6-4.2" />
    </>
  ),
};

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

function formatWallClock(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${meridiem}`;
}

function StatIcon({ name }: { name: keyof typeof STAT_ICONS }) {
  return (
    <span className={`overview-stat-icon is-${name}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {STAT_ICONS[name]}
      </svg>
    </span>
  );
}

function DayProgressRing({ progress, clockLabel }: { progress: number; clockLabel: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="overview-ring">
      <svg viewBox="0 0 130 130" aria-hidden>
        <defs>
          <linearGradient id="ov-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle className="overview-ring-track" cx="65" cy="65" r={radius} />
        <circle
          className="overview-ring-fill"
          cx="65"
          cy="65"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="overview-ring-center">
        <strong>{clockLabel}</strong>
        <span>{Math.round(progress * 100)}% of day</span>
      </div>
    </div>
  );
}

function ClearDayScene() {
  return (
    <svg className="overview-scene" viewBox="0 0 240 150" role="img" aria-label="Clear skies illustration">
      <defs>
        <linearGradient id="ov-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8edff" />
          <stop offset="100%" stopColor="#f7f8fd" />
        </linearGradient>
        <linearGradient id="ov-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="ov-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      <circle cx="120" cy="72" r="62" fill="url(#ov-sky)" />

      <g className="ov-sun">
        <g className="ov-sun-rays">
          {Array.from({ length: 8 }).map((_, index) => (
            <line key={index} x1="152" y1="20" x2="152" y2="27" transform={`rotate(${index * 45} 152 46)`} />
          ))}
        </g>
        <circle cx="152" cy="46" r="17" fill="url(#ov-sun)" />
      </g>

      <g className="ov-cloud is-back">
        <path d="M62 62a15 15 0 0 1 29-5 12 12 0 0 1 16 12H70a9 9 0 0 1-8-7z" />
      </g>
      <g className="ov-cloud is-front">
        <path d="M104 84a18 18 0 0 1 35-6 14 14 0 0 1 18 14h-45a11 11 0 0 1-8-8z" />
      </g>

      <path className="ov-water is-back" d="M34 118q18-11 36 0t36 0 36 0 36 0 26 0" stroke="url(#ov-water)" />
      <path className="ov-water is-front" d="M28 128q18-11 36 0t36 0 36 0 36 0 32 0" stroke="url(#ov-water)" />
    </svg>
  );
}

export function OverviewDashboard({
  onOpenTodayActivities,
  onOpenTodayPersonnel,
  onOpenDay,
  onOpenReports,
}: OverviewDashboardProps) {
  const { notes, loading } = useActivityNotes();
  const startOfSession = useMemo(() => {
    const date = new Date();
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      weekday: date.getDay(),
      minutes: date.getHours() * 60 + date.getMinutes(),
    };
  }, []);
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date());
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const { year, month, day, weekday } = startOfSession;
  const dateKey = toDateKey(year, month, day);
  const nowMinutes = clock ? clock.getHours() * 60 + clock.getMinutes() : startOfSession.minutes;
  const dayProgress = Math.min(1, Math.max(0, nowMinutes / 1440));

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

  const monthly = useMemo(() => buildMonthlyReport(year, month, notes), [year, month, notes]);

  const week = useMemo<WeekDay[]>(() => {
    const maps = new Map<string, Record<number, ScheduleBlock[]>>();
    const mapFor = (y: number, m: number) => {
      const key = `${y}-${m}`;
      let map = maps.get(key);
      if (!map) {
        map = buildVisibleDayMap(y, m, notes);
        maps.set(key, map);
      }
      return map;
    };

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(year, month, day - weekday + index);
      const blocks = mapFor(date.getFullYear(), date.getMonth())[date.getDate()] ?? [];
      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date,
        teams: [...new Set(blocks.map((block) => block.team))],
        isToday: date.getDate() === day && date.getMonth() === month && date.getFullYear() === year,
        inMonth: date.getMonth() === month,
      };
    });
  }, [year, month, day, weekday, notes]);

  const upNext = useMemo(() => {
    const pick = (y: number, m: number, minDay: number) =>
      getVisibleBlocks(y, m, notes)
        .filter((block) => block.end >= minDay)
        .sort((a, b) => Math.max(a.start, minDay) - Math.max(b.start, minDay))[0] ?? null;

    let found = pick(year, month, day + 1);
    let foundYear = year;
    let foundMonth = month;
    let foundDay = found ? Math.max(found.start, day + 1) : 0;

    if (!found) {
      const next = shiftMonth(year, month, 1);
      found = pick(next.year, next.month, 1);
      foundYear = next.year;
      foundMonth = next.month;
      foundDay = found ? found.start : 0;
    }

    if (!found) return null;

    const distance = Math.round(
      (new Date(foundYear, foundMonth, foundDay).getTime() - new Date(year, month, day).getTime()) / MS_PER_DAY,
    );

    return {
      team: found.team,
      location: found.place || found.event || "Scheduled deployment",
      date: new Date(foundYear, foundMonth, foundDay),
      dateLabel: `${MONTH_NAMES[foundMonth].slice(0, 3)} ${foundDay}`,
      distanceLabel: distance <= 1 ? "Tomorrow" : `In ${distance} days`,
    };
  }, [year, month, day, notes]);

  const activeCount = todayBlocks.length;
  const personnel = countAssignedPersonnel(todayBlocks, dateKey, notes);
  const teamsToday = useMemo(() => [...new Set(todayBlocks.map((block) => block.team))], [todayBlocks]);
  const reportRate = monthly.deployments ? monthly.reportsPosted / monthly.deployments : 0;

  const stats = [
    {
      id: "activities" as const,
      label: "Active Activities",
      value: activeCount,
      hint: activeCount ? "Scheduled for today" : "Nothing on the board",
      onClick: onOpenTodayActivities,
    },
    {
      id: "personnel" as const,
      label: "Personnel Assigned",
      value: personnel,
      hint: personnel ? "On duty today" : "No one deployed",
      onClick: onOpenTodayPersonnel,
    },
    {
      id: "teams" as const,
      label: "Teams Deployed",
      value: teamsToday.length,
      hint: teamsToday.length ? teamsToday.map((team) => teamLabel(team)).join(" · ") : "All teams on standby",
      onClick: undefined,
    },
    {
      id: "reports" as const,
      label: "Reports Filed",
      value: monthly.reportsPosted,
      hint: `of ${monthly.deployments} this month`,
      onClick: onOpenReports,
    },
  ];

  return (
    <div className="overview-dashboard">
      <section className="overview-hero">
        <div className="overview-hero-fx" aria-hidden>
          <span className="ov-orb is-a" />
          <span className="ov-orb is-b" />
          <span className="ov-orb is-c" />
          <span className="ov-grid" />
          <span className="ov-hero-wave is-back" />
          <span className="ov-hero-wave is-front" />
        </div>

        <div className="overview-hero-main">
          <p className="overview-hero-eyebrow">
            <span className="ov-live-dot" aria-hidden />
            Live command overview
          </p>
          <h2>Today&apos;s Overview</h2>
          <p className="overview-hero-date">
            {DAY_NAMES[weekday]}, {MONTH_NAMES[month]} {day}, {year}
          </p>
          <p className="overview-hero-status">
            {activeCount
              ? `${activeCount} deployment${activeCount === 1 ? "" : "s"} on the board · ${personnel} personnel on duty`
              : "No deployments on the board — all teams on standby."}
          </p>
        </div>

        <div className="overview-hero-side">
          <DayProgressRing progress={clock ? dayProgress : 0} clockLabel={clock ? formatWallClock(clock) : "--:--"} />
        </div>
      </section>

      <div className="overview-stats">
        {stats.map((stat) => {
          const Tag = stat.onClick ? "button" : "div";
          return (
            <Tag
              key={stat.id}
              {...(stat.onClick ? { type: "button" as const, onClick: stat.onClick } : {})}
              className={`overview-stat is-${stat.id}${stat.onClick ? " is-clickable" : ""}`}
            >
              <StatIcon name={stat.id} />
              <div className="overview-stat-body">
                <strong>{loading ? "…" : stat.value}</strong>
                <span className="overview-stat-label">{stat.label}</span>
                <span className="overview-stat-hint">{stat.hint}</span>
              </div>
              {stat.id === "reports" ? (
                <span className="overview-stat-meter" aria-hidden>
                  <i style={{ width: `${Math.round(reportRate * 100)}%` }} />
                </span>
              ) : null}
              {stat.id === "teams" && teamsToday.length ? (
                <span className="overview-stat-dots" aria-hidden>
                  {teamsToday.map((team) => (
                    <i key={team} style={{ background: dotColor(team) }} />
                  ))}
                </span>
              ) : null}
            </Tag>
          );
        })}
      </div>

      <section className="overview-week-card">
        <div className="overview-week-head">
          <h3>This week</h3>
          <p>Tap a day to open it on the calendar.</p>
        </div>
        <div className="overview-week">
          {week.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`overview-week-day${entry.isToday ? " is-today" : ""}${entry.inMonth ? "" : " is-out"}${
                entry.teams.length ? " has-activity" : ""
              }`}
              onClick={() => onOpenDay(entry.date)}
            >
              <span className="ovw-dow">{DAY_NAMES[entry.date.getDay()].slice(0, 3)}</span>
              <span className="ovw-num">{entry.date.getDate()}</span>
              <span className="ovw-dots" aria-hidden>
                {entry.teams.length ? (
                  entry.teams.map((team) => <i key={team} style={{ background: dotColor(team) }} />)
                ) : (
                  <i className="is-empty" />
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

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
          <div className="overview-empty-state">
            <ClearDayScene />
            <h4>All clear for today</h4>
            <p>No timed deployments or meetings are on the schedule.</p>
            {upNext ? (
              <button type="button" className="overview-next" onClick={() => onOpenDay(upNext.date)}>
                <span className="overview-next-tag">Up next</span>
                <span className="overview-next-body">
                  <strong>{upNext.location}</strong>
                  <span>
                    {teamLabel(upNext.team)} · {upNext.dateLabel} · {upNext.distanceLabel}
                  </span>
                </span>
                <span className="overview-next-arrow" aria-hidden>
                  →
                </span>
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

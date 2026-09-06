"use client";

import { useEffect, useMemo, useState } from "react";
import { teamLabel, toDateKey } from "@/lib/activity-notes";
import { daysInMonth, dotColor } from "@/lib/calendar";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { DAY_NAMES, MONTH_NAMES } from "@/lib/schedule-data";
import { buildVisibleDayMap } from "@/lib/schedule-merge";
import type { TeamKey } from "@/lib/types";
import { useActivityNotes } from "./ActivityNotesProvider";
import { countAssignedPersonnel } from "./DayCompositionView";
import { TeamAvatar } from "./TeamAvatar";

type CommandRibbonProps = {
  onOpenToday?: () => void;
};

const TEAM_ORDER: TeamKey[] = ["usec", "b", "a"];

function formatClock(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${meridiem}`;
}

function RidgeToReefScene() {
  return (
    <svg className="cr-scene" viewBox="0 0 120 52" role="img" aria-label="Ridge to reef illustration">
      <defs>
        <linearGradient id="cr-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="cr-ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="cr-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <g className="cr-sun">
        <circle cx="96" cy="14" r="8" fill="url(#cr-sun)" />
      </g>
      <path className="cr-cloud" d="M18 16a6 6 0 0 1 12-2 5 5 0 0 1 8 6H22a4 4 0 0 1-4-4z" />
      <path className="cr-ridge" d="M6 36 22 18l12 10 10-14 16 16 8-8 16 14H6z" fill="url(#cr-ridge)" />
      <path className="cr-water is-back" d="M4 42q14-7 28 0t28 0 28 0 26 0" />
      <path className="cr-water is-front" d="M2 47q14-7 28 0t28 0 28 0 30 0" />
      <g className="cr-drop">
        <path d="M64 8c1.6 2.1 3.6 4.3 3.6 6.3a3.6 3.6 0 1 1-7.2 0c0-2 2-4.2 3.6-6.3z" />
      </g>
    </svg>
  );
}

export function CommandRibbon({ onOpenToday }: CommandRibbonProps) {
  const { notes, loading } = useActivityNotes();
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

  const now = clock ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const dateKey = toDateKey(year, month, day);
  const totalDays = daysInMonth(year, month);

  const todayBlocks = useMemo(() => {
    const map = buildVisibleDayMap(year, month, notes);
    return map[day] ?? [];
  }, [year, month, day, notes]);

  const monthly = useMemo(() => buildMonthlyReport(year, month, notes), [year, month, notes]);

  const teamsToday = useMemo(
    () => TEAM_ORDER.filter((team) => todayBlocks.some((block) => block.team === team)),
    [todayBlocks],
  );

  const personnel = countAssignedPersonnel(todayBlocks, dateKey, notes);
  const remainingFieldDays = useMemo(() => {
    const map = buildVisibleDayMap(year, month, notes);
    let count = 0;
    for (let next = day + 1; next <= totalDays; next++) {
      if ((map[next] ?? []).some((block) => block.team !== "special")) count += 1;
    }
    return count;
  }, [year, month, day, notes, totalDays]);

  const headline = teamsToday.length
    ? `${teamsToday.length} team${teamsToday.length === 1 ? "" : "s"} in the field`
    : "All teams on standby";
  const detail = teamsToday.length
    ? `${personnel} personnel · ${teamsToday.map((team) => teamLabel(team).replace("Team ", "")).join(" · ")}`
    : `${remainingFieldDays} field day${remainingFieldDays === 1 ? "" : "s"} still ahead`;

  const Tag = onOpenToday ? "button" : "div";

  return (
    <Tag
      className={`command-ribbon${onOpenToday ? " is-clickable" : ""}`}
      {...(onOpenToday ? { type: "button" as const, onClick: onOpenToday } : {})}
      aria-label={onOpenToday ? `Open today's schedule. ${headline}` : headline}
    >
      <span className="cr-fx" aria-hidden>
        <i className="cr-orb is-a" />
        <i className="cr-orb is-b" />
      </span>
      <RidgeToReefScene />
      <span className="cr-live">
        <i className="ov-live-dot" aria-hidden />
        Live
      </span>
      <span className="cr-clock">
        <strong>{clock ? formatClock(clock) : "--:--"}</strong>
        <em>
          {DAY_NAMES[now.getDay()].slice(0, 3)} · {MONTH_NAMES[month].slice(0, 3)} {day}
        </em>
      </span>
      <span className="cr-status">
        <strong>{loading ? "Syncing field desk…" : headline}</strong>
        <em>{loading ? "Reading today’s assignments" : detail}</em>
      </span>
      <span className="cr-meta" aria-hidden>
        <b>{loading ? "…" : monthly.fieldDays}</b>
        <i>field days</i>
      </span>
      <span className="cr-teams" aria-hidden>
        {TEAM_ORDER.map((team) => (
          <span key={team} className={`cr-team${teamsToday.includes(team) ? " is-on" : ""}`} title={teamLabel(team)}>
            <TeamAvatar teamKey={team} size={22} />
            <i style={{ background: dotColor(team) }} />
          </span>
        ))}
      </span>
    </Tag>
  );
}

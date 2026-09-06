"use client";

import { useMemo } from "react";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { TEAM_META } from "@/lib/schedule-data";
import { useActivityNotes } from "./ActivityNotesProvider";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";

type LegendProps = {
  hint?: string;
  viewYear?: number;
  viewMonth?: number;
};

export function Legend({ hint = "Click any date for details", viewYear, viewMonth }: LegendProps) {
  const { notes } = useActivityNotes();
  const monthly = useMemo(
    () => (viewYear != null && viewMonth != null ? buildMonthlyReport(viewYear, viewMonth, notes) : null),
    [viewYear, viewMonth, notes],
  );

  return (
    <div className="legend">
      <TeamLink team="usec" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--usec)" }} />
        Team USEC
        <TeamAvatar teamKey="usec" size={36} />
        {monthly ? <em className="legend-count">{monthly.teams[0]?.fieldDays ?? 0}d</em> : null}
      </TeamLink>
      <TeamLink team="b" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--teamb)" }} />
        Team B
        <TeamAvatar teamKey="b" size={36} />
        {monthly ? <em className="legend-count">{monthly.teams[1]?.fieldDays ?? 0}d</em> : null}
      </TeamLink>
      <TeamLink team="a" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--teama)" }} />
        Team A
        <TeamAvatar teamKey="a" size={36} />
        {monthly ? <em className="legend-count">{monthly.teams[2]?.fieldDays ?? 0}d</em> : null}
      </TeamLink>
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--special)" }} /> Special Event
        {monthly ? <em className="legend-count">{monthly.specialEvents.length}</em> : null}
      </div>
      <div className="legend-item is-hint">
        <span className="dot" style={{ background: "#111", opacity: 0.3 }} /> {hint}
      </div>
    </div>
  );
}

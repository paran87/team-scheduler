"use client";

import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";

export function Legend({ hint = "Click any date for details" }: { hint?: string }) {
  return (
    <div className="legend">
      <TeamLink team="usec" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--usec)" }} /> Team USEC
        <TeamAvatar teamKey="usec" size={36} />
      </TeamLink>
      <TeamLink team="b" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--teamb)" }} /> Team B
        <TeamAvatar teamKey="b" size={36} />
      </TeamLink>
      <TeamLink team="a" className="legend-item team-nav-link">
        <span className="dot" style={{ background: "var(--teama)" }} /> Team A
        <TeamAvatar teamKey="a" size={36} />
      </TeamLink>
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--special)" }} /> Special Event
      </div>
      <div className="legend-item">
        <span className="dot" style={{ background: "#111", opacity: 0.3 }} /> {hint}
      </div>
    </div>
  );
}

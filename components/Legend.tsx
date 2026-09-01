"use client";

import { TeamAvatar } from "./TeamAvatar";

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--usec)" }} /> Team USEC
        <TeamAvatar teamKey="usec" size={36} />
      </div>
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--teamb)" }} /> Team B
        <TeamAvatar teamKey="b" size={36} />
      </div>
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--teama)" }} /> Team A
        <TeamAvatar teamKey="a" size={36} />
      </div>
      <div className="legend-item">
        <span className="dot" style={{ background: "var(--special)" }} /> Special Event
      </div>
      <div className="legend-item">
        <span className="dot" style={{ background: "#111", opacity: 0.3 }} /> Click any date for details
      </div>
    </div>
  );
}

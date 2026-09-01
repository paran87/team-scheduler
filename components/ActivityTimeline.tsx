"use client";

import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { getBlocksForMonth } from "@/lib/calendar";
import { TeamAvatar } from "./TeamAvatar";

type ActivityTimelineProps = {
  viewYear: number;
  viewMonth: number;
};

export function ActivityTimeline({ viewYear, viewMonth }: ActivityTimelineProps) {
  const blocks = [...getBlocksForMonth(viewYear, viewMonth)].sort((a, b) => a.start - b.start);

  if (!blocks.length) {
    return (
      <div className="empty-panel">
        <span className="emoji">📭</span>
        No activity recorded for {MONTH_NAMES[viewMonth]} {viewYear}.
      </div>
    );
  }

  return (
    <div className="timeline">
      {blocks.map((block, index) => {
        const rangeLabel =
          block.start === block.end
            ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${block.start}`
            : `${MONTH_NAMES[viewMonth].slice(0, 3)} ${block.start}–${block.end}`;

        if (block.team === "special") {
          return (
            <div
              key={`${block.team}-${block.start}-${index}`}
              className="timeline-item team-special"
            >
              <div className="timeline-dot" />
              <div className="activity-card special">
                <div className="activity-left">
                  <div className="activity-date-badge">{rangeLabel}</div>
                  <div className="activity-info">
                    <p className="place">★ {block.event}</p>
                    <p className="note">Special company-wide event</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        const meta = TEAM_META[block.team];

        return (
          <div
            key={`${block.team}-${block.start}-${index}`}
            className={`timeline-item team-${block.team}`}
          >
            <div className="timeline-dot" />
            <div className="activity-card">
              <div className="activity-left">
                <div className="activity-date-badge">{rangeLabel}</div>
                <div className="activity-info">
                  <p className="place">{block.place}</p>
                  {block.event ? <p className="note">{block.event}</p> : null}
                </div>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span className="activity-team-chip" style={{ background: meta.color }}>
                  {meta.label}
                </span>
                <TeamAvatar teamKey={block.team} size={32} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

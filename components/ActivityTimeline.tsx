"use client";

import { useEffect } from "react";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { activityId } from "@/lib/calendar";
import { getVisibleBlocks } from "@/lib/schedule-merge";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";
import { ActivityFields } from "./ActivityFields";
import { useActivityNotes } from "./ActivityNotesProvider";
import { activityReportPath, notesForBlock, toDateKey } from "@/lib/activity-notes";
import { durationLabelForAssignment } from "@/lib/assignment-duration";

type ActivityTimelineProps = {
  viewYear: number;
  viewMonth: number;
  focusId?: string | null;
};

export function ActivityTimeline({ viewYear, viewMonth, focusId }: ActivityTimelineProps) {
  const { notes } = useActivityNotes();
  const blocks = [...getVisibleBlocks(viewYear, viewMonth, notes)].sort((a, b) => a.start - b.start);

  useEffect(() => {
    if (!focusId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`activity-${focusId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusId, viewYear, viewMonth]);

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
          const fields = notesForBlock(notes, viewYear, viewMonth, block);
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
                    <p className="place">★ {block.event || fields.event}</p>
                    <p className="note">Special company-wide event</p>
                    <ActivityFields
                      location={block.place || fields.location}
                      duration={durationLabelForAssignment(viewYear, viewMonth, block.start, block.team, notes, block.start, block.end)}
                      activity={block.activity ?? fields.activity}
                      reportHref={activityReportPath(toDateKey(viewYear, viewMonth, block.start), block.team)}
                      variant="onDark"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }

        const meta = TEAM_META[block.team];
        const fields = notesForBlock(notes, viewYear, viewMonth, block);
        const id = activityId(block);
        const focused = focusId === id;

        return (
          <div
            key={id}
            id={`activity-${id}`}
            className={`timeline-item team-${block.team}`}
          >
            <div className="timeline-dot" />
            <div className={`activity-card${focused ? " is-focused" : ""}`}>
              <div className="activity-left">
                <div className="activity-date-badge">{rangeLabel}</div>
                <div className="activity-info">
                  <p className="place">{block.place || fields.location}</p>
                  {block.event && block.event !== block.place ? <p className="note">{block.event}</p> : null}
                  <ActivityFields
                    location={block.place || fields.location}
                    duration={durationLabelForAssignment(viewYear, viewMonth, block.start, block.team, notes, block.start, block.end)}
                    activity={block.activity ?? fields.activity}
                    reportHref={activityReportPath(toDateKey(viewYear, viewMonth, block.start), block.team)}
                  />
                </div>
              </div>
              <TeamLink team={block.team} date={toDateKey(viewYear, viewMonth, block.start)} className="team-nav-link">
                <span style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <span className="activity-team-chip" style={{ background: meta.color }}>
                    {meta.label}
                  </span>
                  <TeamAvatar teamKey={block.team} size={32} />
                </span>
              </TeamLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}

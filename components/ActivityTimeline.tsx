"use client";

import { useEffect, useMemo, useState } from "react";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { activityId, dotColor } from "@/lib/calendar";
import { getVisibleBlocks } from "@/lib/schedule-merge";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";
import { ActivityFields } from "./ActivityFields";
import { useActivityNotes } from "./ActivityNotesProvider";
import { activityReportPath, findNote, noteHasReport, notesForBlock, toDateKey } from "@/lib/activity-notes";
import { durationLabelForAssignment } from "@/lib/assignment-duration";
import type { BlockTeam, TeamKey } from "@/lib/types";

type ActivityFilter = "all" | TeamKey | "special";

type ActivityTimelineProps = {
  viewYear: number;
  viewMonth: number;
  focusId?: string | null;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
};

const FILTERS: Array<{ id: ActivityFilter; label: string }> = [
  { id: "all", label: "All teams" },
  { id: "usec", label: "Team USEC" },
  { id: "b", label: "Team B" },
  { id: "a", label: "Team A" },
  { id: "special", label: "Specials" },
];

function LogScene() {
  return (
    <svg className="activity-scene" viewBox="0 0 160 92" role="img" aria-label="Activity log illustration">
      <defs>
        <linearGradient id="al-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="al-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <circle className="al-sun" cx="132" cy="20" r="10" fill="url(#al-sun)" />
      <path className="al-cloud" d="M18 24a7 7 0 0 1 14-2 6 6 0 0 1 9 7H24a5 5 0 0 1-6-5z" />
      <g className="al-page">
        <rect x="38" y="18" width="72" height="62" rx="10" fill="url(#al-page)" />
        <path d="M50 34h40M50 44h34M50 54h28" />
        <circle cx="96" cy="64" r="8" fill="#6366f1" />
        <path d="M93 64h6M96 61v6" stroke="#eef0ff" strokeWidth="1.6" />
      </g>
      <path className="al-water" d="M12 82q16-8 32 0t32 0 32 0 32 0" />
    </svg>
  );
}

export function ActivityTimeline({
  viewYear,
  viewMonth,
  focusId,
  onPrevMonth,
  onNextMonth,
}: ActivityTimelineProps) {
  const { notes } = useActivityNotes();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const blocks = useMemo(
    () => [...getVisibleBlocks(viewYear, viewMonth, notes)].sort((a, b) => a.start - b.start),
    [viewYear, viewMonth, notes],
  );
  const visible = filter === "all" ? blocks : blocks.filter((block) => block.team === filter);

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

  return (
    <div className="activity-log">
      <section className="activity-hero">
        <div className="activity-hero-fx" aria-hidden>
          <span className="ov-orb is-a" />
          <span className="ov-orb is-b" />
          <span className="ov-grid" />
          <span className="ov-hero-wave is-back" />
        </div>
        <div className="activity-hero-copy">
          <p className="activity-hero-eyebrow">
            <span className="ov-live-dot" aria-hidden />
            Field activity log
          </p>
          <h2>Team Activities</h2>
          <p className="activity-hero-status">
            Chronological deployments for {MONTH_NAMES[viewMonth]} {viewYear}.
          </p>
        </div>
        {onPrevMonth && onNextMonth ? (
          <div className="activity-month-nav">
            <button type="button" className="calendar-nav-btn is-on-dark" title="Previous month" aria-label="Previous month" onClick={onPrevMonth}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <strong>
              {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
            </strong>
            <button type="button" className="calendar-nav-btn is-on-dark" title="Next month" aria-label="Next month" onClick={onNextMonth}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        ) : null}
      </section>

      <div className="activity-toolbar">
        <div className="activity-filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`activity-filter${filter === item.id ? " is-on" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.id !== "all" && item.id !== "special" ? <TeamAvatar teamKey={item.id} size={22} /> : null}
              {item.id === "special" ? <i className="activity-filter-dot" style={{ background: "var(--special)" }} /> : null}
              {item.id === "all" ? <i className="activity-filter-dot is-all" /> : null}
              {item.label}
            </button>
          ))}
        </div>
        <p className="activity-count">
          {visible.length} of {blocks.length} this month
        </p>
      </div>

      {!visible.length ? (
        <div className="activity-empty">
          <LogScene />
          <h3>{blocks.length ? "Nothing in this filter" : "No activity recorded"}</h3>
          <p>
            {blocks.length
              ? "Try another team to see their deployments."
              : `No deployments are logged for ${MONTH_NAMES[viewMonth]} ${viewYear}.`}
          </p>
        </div>
      ) : (
        <div className="timeline">
          {visible.map((block, index) => {
            const rangeLabel =
              block.start === block.end
                ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${block.start}`
                : `${MONTH_NAMES[viewMonth].slice(0, 3)} ${block.start}–${block.end}`;
            const fields = notesForBlock(notes, viewYear, viewMonth, block);
            const startDateKey = toDateKey(viewYear, viewMonth, block.start);
            const startNote = findNote(notes, startDateKey, block.team);

            if (block.team === "special") {
              return (
                <div key={`${block.team}-${block.start}-${index}`} className="timeline-item team-special">
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
                          reportHref={noteHasReport(startNote) ? activityReportPath(startDateKey, block.team) : undefined}
                          variant="onDark"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const meta = TEAM_META[block.team];
            const id = activityId(block);
            const focused = focusId === id;

            return (
              <div key={id} id={`activity-${id}`} className={`timeline-item team-${block.team}`}>
                <div className="timeline-dot" />
                <div
                  className={`activity-card${focused ? " is-focused" : ""}`}
                  style={{ ["--team-accent" as string]: dotColor(block.team as BlockTeam) }}
                >
                  <div className="activity-left">
                    <div className="activity-date-badge">{rangeLabel}</div>
                    <div className="activity-info">
                      <p className="place">{block.place || fields.location}</p>
                      {block.event && block.event !== block.place ? <p className="note">{block.event}</p> : null}
                      <ActivityFields
                        location={block.place || fields.location}
                        duration={durationLabelForAssignment(viewYear, viewMonth, block.start, block.team, notes, block.start, block.end)}
                        activity={block.activity ?? fields.activity}
                        reportHref={noteHasReport(startNote) ? activityReportPath(startDateKey, block.team) : undefined}
                      />
                    </div>
                  </div>
                  <TeamLink team={block.team} date={toDateKey(viewYear, viewMonth, block.start)} className="team-nav-link">
                    <span className="activity-team">
                      <span className="activity-team-chip" style={{ background: meta.color }}>
                        {meta.label}
                      </span>
                      <TeamAvatar teamKey={block.team} size={36} />
                    </span>
                  </TeamLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

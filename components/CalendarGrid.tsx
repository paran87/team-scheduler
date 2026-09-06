"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { daysInMonth, dotColor, isToday } from "@/lib/calendar";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { buildVisibleDayMap } from "@/lib/schedule-merge";
import type { ScheduleBlock, TeamKey } from "@/lib/types";
import { useActivityNotes } from "./ActivityNotesProvider";

type CalendarGridProps = {
  viewYear: number;
  viewMonth: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onJumpToday?: () => void;
};

type BlankCell = { kind: "blank"; key: string; num: number };
type DayCell = {
  kind: "day";
  key: string;
  day: number;
  entries: ScheduleBlock[];
  special?: ScheduleBlock;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
};

const TEAM_ORDER: TeamKey[] = ["usec", "b", "a"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function getCells(
  viewYear: number,
  viewMonth: number,
  selectedDay: number | null,
  notes: ReturnType<typeof useActivityNotes>["notes"],
): Array<BlankCell | DayCell> {
  const total = daysInMonth(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const lastDow = new Date(viewYear, viewMonth, total).getDay();
  const trailing = 6 - lastDow;
  const perDay = buildVisibleDayMap(viewYear, viewMonth, notes);
  const cells: Array<BlankCell | DayCell> = [];

  for (let i = firstDow; i > 0; i--) {
    const d = new Date(viewYear, viewMonth, 1 - i);
    cells.push({ kind: "blank", key: `lead-${i}`, num: d.getDate() });
  }

  for (let day = 1; day <= total; day++) {
    const dow = new Date(viewYear, viewMonth, day).getDay();
    const entries = perDay[day] ?? [];
    cells.push({
      kind: "day",
      key: `day-${day}`,
      day,
      entries,
      special: entries.find((e) => e.team === "special"),
      isToday: isToday(viewYear, viewMonth, day),
      isSelected: selectedDay === day,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  for (let i = 1; i <= trailing; i++) {
    const d = new Date(viewYear, viewMonth, total + i);
    cells.push({ kind: "blank", key: `trail-${i}`, num: d.getDate() });
  }

  return cells;
}

function fieldTeams(entries: ScheduleBlock[]): TeamKey[] {
  return TEAM_ORDER.filter((team) => entries.some((entry) => entry.team === team));
}

function spanLabel(entry: ScheduleBlock, day: number) {
  if (entry.start === entry.end) return null;
  return `${day - entry.start + 1}/${entry.end - entry.start + 1}`;
}

function isMeeting(entry: ScheduleBlock) {
  return Boolean(entry.activity?.trim()) && !entry.place?.trim();
}

function SpecialMark({ name }: { name: string }) {
  const lower = name.toLowerCase();
  let glyph: ReactNode = (
    <path d="M12 2.6 14.4 8l5.8.6-4.4 3.8 1.3 5.6L12 15.6 6.9 18l1.3-5.6L3.8 8.6 9.6 8z" />
  );
  if (lower.includes("farm")) {
    glyph = (
      <>
        <path d="M12 21c-4.4 0-7.2-3.4-7.2-7.6C4.8 8.6 12 3 12 3s7.2 5.6 7.2 10.4C19.2 17.6 16.4 21 12 21z" />
        <path d="M12 10.2c1.8 1.4 3 3.4 3 5.4" />
      </>
    );
  } else if (lower.includes("born")) {
    glyph = (
      <>
        <path d="M8 10h8l1.4 9H6.6z" />
        <path d="M9 10V8.2c0-1.4 1.2-2.2 3-2.2s3 .8 3 2.2V10" />
        <path d="M12 4.4V6" />
      </>
    );
  } else if (lower.includes("boogie")) {
    glyph = (
      <>
        <path d="M9 8v10" />
        <circle cx="7.4" cy="18" r="2.2" />
        <path d="M15 6v10" />
        <circle cx="13.4" cy="16" r="2.2" />
        <path d="M9 8c2.4 1 3.6 1 6-2" />
      </>
    );
  }

  return (
    <span className="cal-special-mark" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {glyph}
      </svg>
    </span>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1.6a4.2 4.2 0 0 1 4.2 4.2c0 3.2-4.2 8.6-4.2 8.6S3.8 9 3.8 5.8A4.2 4.2 0 0 1 8 1.6z" />
      <circle cx="8" cy="5.8" r="1.5" />
    </svg>
  );
}

export function CalendarGrid({
  viewYear,
  viewMonth,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
}: CalendarGridProps) {
  const { notes } = useActivityNotes();
  const cells = useMemo(
    () => getCells(viewYear, viewMonth, selectedDay, notes),
    [viewYear, viewMonth, selectedDay, notes],
  );
  const monthly = useMemo(() => buildMonthlyReport(viewYear, viewMonth, notes), [viewYear, viewMonth, notes]);
  const now = useMemo(() => new Date(), []);
  const todayDay = now.getDate();
  const todayDow = now.getDay();
  const viewingCurrent = isToday(viewYear, viewMonth, todayDay);
  const isCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === viewMonth;

  const specials = useMemo(
    () =>
      monthly.specialEvents.map((label) => {
        const [name, when] = label.split(" · ");
        return { name: name || "Special event", when: when || "" };
      }),
    [monthly.specialEvents],
  );

  const hotspots = useMemo(
    () =>
      [...monthly.locationList]
        .sort((a, b) => b.teams.length - a.teams.length || a.location.localeCompare(b.location))
        .slice(0, 3),
    [monthly.locationList],
  );

  return (
    <div className="calendar-wrap">
      <div className="cal-board">
        <div className="calendar-month-nav">
          <span className="cal-month-fx" aria-hidden>
            <i className="cal-month-orb is-a" />
            <i className="cal-month-orb is-b" />
            <i className="cal-month-wave" />
          </span>
          <button
            type="button"
            className="calendar-nav-btn"
            title="Previous month"
            aria-label="Previous month"
            onClick={onPrevMonth}
            disabled={!onPrevMonth}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="cal-month-copy">
            <p className="cal-month-kicker">Field month</p>
            <h2 className="calendar-month-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
          </div>
          <button
            type="button"
            className="calendar-nav-btn"
            title="Next month"
            aria-label="Next month"
            onClick={onNextMonth}
            disabled={!onNextMonth}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          {onJumpToday && !viewingCurrent ? (
            <button type="button" className="cal-jump-today is-on-light" onClick={onJumpToday}>
              Today
            </button>
          ) : null}
        </div>
        <div className="weekday-row">
          {WEEKDAYS.map((label, index) => (
            <div key={label} className={isCurrentMonth && todayDow === index ? "is-today-dow" : undefined}>
              {label}
            </div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((cell) => {
            if (cell.kind === "blank") {
              return (
                <div key={cell.key} className="cal-cell blank">
                  <div className="cell-top">
                    <span className="cell-num">{cell.num}</span>
                  </div>
                </div>
              );
            }

            const teams = fieldTeams(cell.entries);
            const classes = ["cal-cell"];
            if (cell.isWeekend) classes.push("weekend");
            if (cell.isToday) classes.push("is-today");
            if (cell.isSelected) classes.push("is-selected");
            if (cell.special) classes.push("is-special");
            if (!cell.special && teams.length === 1) classes.push(`has-${teams[0]}`);
            if (!cell.special && teams.length > 1) classes.push("is-multi");
            if (cell.entries.length >= 3) classes.push("is-busy");

            const maxShow = 2;
            const visible = cell.entries.filter((entry) => entry.team !== "special").slice(0, maxShow);
            const extra = cell.entries.filter((entry) => entry.team !== "special").length - visible.length;

            return (
              <div
                key={cell.key}
                className={classes.join(" ")}
                onClick={() => onSelectDay(cell.day)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDay(cell.day);
                  }
                }}
              >
                {!cell.special && teams.length ? (
                  <span className="cal-cell-bands" aria-hidden>
                    {teams.map((team) => (
                      <i key={team} style={{ background: dotColor(team) }} />
                    ))}
                  </span>
                ) : null}

                <div className="cell-top">
                  <span className="cell-num">{cell.day}</span>
                  {cell.isToday ? <span className="today-tag">Today</span> : null}
                  {!cell.special && teams.length > 1 ? (
                    <span className="cal-occupancy">{teams.length} teams</span>
                  ) : null}
                </div>

                {cell.special ? (
                  <div className="special-label">
                    <SpecialMark name={cell.special.event || "Special Event"} />
                    <strong>★ {cell.special.event || "Special Event"}</strong>
                  </div>
                ) : cell.entries.length ? (
                  <>
                    <div className="cell-events">
                      {visible.map((entry, index) => {
                        const meta = TEAM_META[entry.team as TeamKey];
                        const span = spanLabel(entry, cell.day);
                        return (
                          <div key={`${entry.team}-${index}`} className={`event-chip ${meta.chip}`}>
                            <span className="dot-sm" style={{ background: dotColor(entry.team) }} />
                            {isMeeting(entry) ? (
                              <span className="cal-chip-icon" aria-hidden>
                                <svg viewBox="0 0 16 16">
                                  <circle cx="8" cy="8" r="6" />
                                  <path d="M8 4.4V8l2.2 1.4" />
                                </svg>
                              </span>
                            ) : (
                              <span className="cal-chip-icon" aria-hidden>
                                <PinIcon />
                              </span>
                            )}
                            <span className="cal-chip-text">{entry.place || entry.event || "Scheduled"}</span>
                            {span ? <em className="cal-span">{span}</em> : null}
                          </div>
                        );
                      })}
                      {extra > 0 ? <div className="event-more">+{extra} more</div> : null}
                    </div>
                    <div className="dots-row">
                      {cell.entries.map((entry, index) => (
                        <span
                          key={`${entry.team}-dot-${index}`}
                          className="dot-sm"
                          style={{ background: dotColor(entry.team) }}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <section className="cal-pulse">
        <div className="cal-pulse-col">
          <h3>Special this month</h3>
          {specials.length ? (
            <ul>
              {specials.map((item) => (
                <li key={`${item.name}-${item.when}`}>
                  <SpecialMark name={item.name} />
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.when}</em>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cal-pulse-empty">No special events on the board.</p>
          )}
        </div>
        <div className="cal-pulse-col">
          <h3>Hotspot locations</h3>
          {hotspots.length ? (
            <ul>
              {hotspots.map((item) => (
                <li key={item.location}>
                  <span className="cal-pulse-pin" aria-hidden>
                    <PinIcon />
                  </span>
                  <span>
                    <strong>{item.location}</strong>
                    <em>
                      {item.teams.map((team) => TEAM_META[team].label.replace("Team ", "")).join(" · ")} · {item.coverage}
                    </em>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cal-pulse-empty">No field sites scheduled yet.</p>
          )}
        </div>
        <div className="cal-pulse-col is-hint">
          <h3>How to read</h3>
          <p>Colored bands mark which teams are in the field. Pins are sites, clocks are meetings, and red days are special events. Open any date for the full brief.</p>
        </div>
      </section>
    </div>
  );
}

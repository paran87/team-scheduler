"use client";

import { TEAM_META } from "@/lib/schedule-data";
import { daysInMonth, dotColor, isToday } from "@/lib/calendar";
import { buildVisibleDayMap } from "@/lib/schedule-merge";
import { type ActivityNote } from "@/lib/activity-notes";
import { useActivityNotes } from "./ActivityNotesProvider";
import type { ScheduleBlock } from "@/lib/types";

type CalendarGridProps = {
  viewYear: number;
  viewMonth: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
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

function getCells(
  viewYear: number,
  viewMonth: number,
  selectedDay: number | null,
  notes: ActivityNote[],
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

export function CalendarGrid({
  viewYear,
  viewMonth,
  selectedDay,
  onSelectDay,
}: CalendarGridProps) {
  const { notes } = useActivityNotes();
  const cells = getCells(viewYear, viewMonth, selectedDay, notes);

  return (
    <div className="calendar-wrap">
      <div className="weekday-row">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
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

          const classes = ["cal-cell"];
          if (cell.isWeekend) classes.push("weekend");
          if (cell.isToday) classes.push("is-today");
          if (cell.isSelected) classes.push("is-selected");
          if (cell.special) classes.push("is-special");

          const maxShow = 2;
          const visible = cell.entries.slice(0, maxShow);

          return (
            <div
              key={cell.key}
              className={classes.join(" ")}
              onClick={() => onSelectDay(cell.day)}
            >
              <div className="cell-top">
                <span className="cell-num">{cell.day}</span>
                {cell.isToday ? <span className="today-tag">Today</span> : null}
              </div>
              {cell.special ? (
                <div className="special-label">★ {cell.special.event || "Special Event"}</div>
              ) : cell.entries.length ? (
                <>
                  <div className="cell-events">
                    {visible.map((entry, index) => {
                      if (entry.team === "special") return null;
                      const meta = TEAM_META[entry.team];
                      return (
                        <div key={`${entry.team}-${index}`} className={`event-chip ${meta.chip}`}>
                          <span className="dot-sm" style={{ background: dotColor(entry.team) }} />
                          {entry.place || entry.event}
                        </div>
                      );
                    })}
                    {cell.entries.length > maxShow ? (
                      <div className="event-more">+{cell.entries.length - maxShow} more</div>
                    ) : null}
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
  );
}

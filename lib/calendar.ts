import { scheduleBlocks } from "./schedule-data";
import type { BlockTeam, ScheduleBlock } from "./types";

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getBlocksForMonth(year: number, monthIndex: number) {
  return scheduleBlocks[`${year}-${monthIndex + 1}`] ?? [];
}

export function buildPerDayMap(year: number, monthIndex: number) {
  const blocks = getBlocksForMonth(year, monthIndex);
  const map: Record<number, ScheduleBlock[]> = {};

  for (const block of blocks) {
    for (let d = block.start; d <= block.end; d++) {
      if (!map[d]) map[d] = [];
      map[d].push(block);
    }
  }

  return map;
}

export function isToday(year: number, monthIndex: number, day: number, today = new Date()) {
  return (
    today.getFullYear() === year &&
    today.getMonth() === monthIndex &&
    today.getDate() === day
  );
}

export function dotColor(team: BlockTeam) {
  if (team === "usec") return "var(--usec)";
  if (team === "b") return "var(--teamb)";
  if (team === "a") return "var(--teama)";
  return "var(--special)";
}

export function shiftMonth(year: number, monthIndex: number, offset: number) {
  let nextMonth = monthIndex + offset;
  let nextYear = year;
  if (nextMonth < 0) {
    nextMonth = 11;
    nextYear -= 1;
  }
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

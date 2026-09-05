import { findNote, parseDateKey, scheduledBlock, toDateKey, type ActivityNote } from "./activity-notes";
import { MONTH_NAMES } from "./schedule-data";
import type { BlockTeam } from "./types";

export const MAX_DURATION_DAYS = 31;

function assignmentSignature(
  year: number,
  monthIndex: number,
  day: number,
  team: BlockTeam,
  notes: ActivityNote[],
): string | null {
  const date = toDateKey(year, monthIndex, day);
  const note = findNote(notes, date, team);
  if (note?.hidden) return null;
  const block = scheduledBlock(date, team);
  if (!note && !block) return null;
  const location = (note?.location || block?.place || block?.event || "").trim().toLowerCase();
  const event = (note?.event || (block?.team === "special" ? block.event : "") || "").trim().toLowerCase();
  return `${location}|${event}`;
}

export function resolveDuration(start: string, end: string, fallbackDate: string): { start: string; end: string } {
  const from = parseDateKey(start.trim()) ? start.trim() : fallbackDate;
  const to = parseDateKey(end.trim()) ? end.trim() : fallbackDate;
  return from <= to ? { start: from, end: to } : { start: to, end: from };
}

export function eachDateKey(start: string, end: string): string[] {
  const from = parseDateKey(start);
  const to = parseDateKey(end);
  if (!from || !to) return [];
  const dates: string[] = [];
  const cursor = new Date(from.year, from.monthIndex, from.day);
  const last = new Date(to.year, to.monthIndex, to.day);
  const begin = cursor <= last ? cursor : last;
  const finish = cursor <= last ? last : cursor;
  while (begin <= finish) {
    dates.push(toDateKey(begin.getFullYear(), begin.getMonth(), begin.getDate()));
    begin.setDate(begin.getDate() + 1);
    if (dates.length > MAX_DURATION_DAYS) break;
  }
  return dates;
}

export function contiguousAssignmentDays(
  year: number,
  monthIndex: number,
  selectedDay: number,
  team: BlockTeam,
  notes: ActivityNote[],
): number[] {
  const signature = assignmentSignature(year, monthIndex, selectedDay, team, notes);
  if (!signature) return [selectedDay];

  let start = selectedDay;
  let end = selectedDay;
  while (assignmentSignature(year, monthIndex, start - 1, team, notes) === signature) start -= 1;
  while (assignmentSignature(year, monthIndex, end + 1, team, notes) === signature) end += 1;

  const days: number[] = [];
  for (let day = start; day <= end; day++) days.push(day);
  return days;
}

export function durationFieldsForDate(dateKey: string, team: BlockTeam, notes: ActivityNote[]): {
  durationStart: string;
  durationEnd: string;
} {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return { durationStart: "", durationEnd: "" };
  const run = contiguousAssignmentDays(parsed.year, parsed.monthIndex, parsed.day, team, notes);
  if (run.length > 1) {
    return {
      durationStart: toDateKey(parsed.year, parsed.monthIndex, run[0]),
      durationEnd: toDateKey(parsed.year, parsed.monthIndex, run[run.length - 1]),
    };
  }
  return { durationStart: "", durationEnd: "" };
}

export function formatDurationRange(year: number, monthIndex: number, startDay: number, endDay: number) {
  const month = MONTH_NAMES[monthIndex].slice(0, 3);
  if (startDay === endDay) return `${month} ${startDay}, ${year}`;
  return `${month} ${startDay} – ${endDay}, ${year}`;
}

export function durationLabelForAssignment(
  year: number,
  monthIndex: number,
  day: number,
  team: BlockTeam,
  notes: ActivityNote[],
  fallbackStart = day,
  fallbackEnd = day,
) {
  const run = contiguousAssignmentDays(year, monthIndex, day, team, notes);
  const start = run[0] ?? fallbackStart;
  const end = run[run.length - 1] ?? fallbackEnd;
  return formatDurationRange(year, monthIndex, start, end);
}

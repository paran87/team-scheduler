import { getBlocksForMonth } from "./calendar";
import { findNote, parseDateKey, toDateKey, type ActivityNote } from "./activity-notes";
import type { ScheduleBlock } from "./types";

function text(value?: string) {
  const next = value?.trim() ?? "";
  return next || undefined;
}

function applyNoteToBlock(block: ScheduleBlock, note?: ActivityNote): ScheduleBlock {
  if (!note || note.hidden) return block;
  return {
    ...block,
    place: text(note.location),
    event: text(note.event) || (block.team === "special" ? text(note.location) : undefined),
    activity: text(note.activity),
    remarks: text(note.remarks),
  };
}

function sameVisibleBlock(a: ScheduleBlock, b: ScheduleBlock) {
  return (
    a.place === b.place &&
    a.event === b.event &&
    a.activity === b.activity &&
    a.remarks === b.remarks
  );
}

export function getVisibleBlocks(
  year: number,
  monthIndex: number,
  notes: ActivityNote[] = [],
): ScheduleBlock[] {
  const base = getBlocksForMonth(year, monthIndex);
  const result: ScheduleBlock[] = [];

  for (const block of base) {
    let current: ScheduleBlock | null = null;

    const flush = () => {
      if (current) result.push(current);
      current = null;
    };

    for (let day = block.start; day <= block.end; day++) {
      const note = findNote(notes, toDateKey(year, monthIndex, day), block.team);
      if (note?.hidden) {
        flush();
        continue;
      }

      const next = applyNoteToBlock(
        { ...block, start: day, end: day },
        note,
      );

      if (current && current.end === day - 1 && sameVisibleBlock(current, next)) {
        const ongoing: ScheduleBlock = current;
        current = { ...ongoing, end: day };
      } else {
        flush();
        current = next;
      }
    }

    flush();
  }

  const extras: ScheduleBlock[] = [];
  const seen = new Set<string>();

  for (const note of notes) {
    if (note.hidden) continue;
    const parsed = parseDateKey(note.date);
    if (!parsed || parsed.year !== year || parsed.monthIndex !== monthIndex) continue;

    const covered = base.some(
      (block) => block.team === note.team && parsed.day >= block.start && parsed.day <= block.end,
    );
    if (covered) continue;

    const key = `${note.team}-${parsed.day}-${note.location || note.activity || "na"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    extras.push({
      team: note.team,
      start: parsed.day,
      end: parsed.day,
      place: note.location || undefined,
      event: note.event || (note.team === "special" ? note.location || note.activity || "Special Event" : undefined),
      activity: note.activity || undefined,
      remarks: note.remarks || undefined,
    });
  }

  return [...result, ...extras].sort((a, b) => a.start - b.start || a.team.localeCompare(b.team));
}

export function buildVisibleDayMap(
  year: number,
  monthIndex: number,
  notes: ActivityNote[] = [],
) {
  const blocks = getVisibleBlocks(year, monthIndex, notes);
  const map: Record<number, ScheduleBlock[]> = {};

  for (const block of blocks) {
    for (let day = block.start; day <= block.end; day++) {
      if (!map[day]) map[day] = [];
      map[day].push(block);
    }
  }

  return map;
}

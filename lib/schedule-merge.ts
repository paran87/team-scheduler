import { getBlocksForMonth } from "./calendar";
import { parseDateKey, type ActivityNote } from "./activity-notes";
import type { ScheduleBlock } from "./types";

export function getVisibleBlocks(
  year: number,
  monthIndex: number,
  notes: ActivityNote[] = [],
): ScheduleBlock[] {
  const base = getBlocksForMonth(year, monthIndex);
  const extras: ScheduleBlock[] = [];
  const seen = new Set<string>();

  for (const note of notes) {
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
      event: note.team === "special" ? note.location || note.activity || "Special Event" : undefined,
      activity: note.activity || undefined,
      remarks: note.remarks || undefined,
    });
  }

  return [...base, ...extras].sort((a, b) => a.start - b.start || a.team.localeCompare(b.team));
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

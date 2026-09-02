import { getBlocksForMonth } from "./calendar";
import type { BlockTeam, ScheduleBlock, TeamKey } from "./types";

export const ACTIVITY_CHANNEL = "activity-notes";

export type ActivityNote = {
  id: string;
  date: string;
  team: BlockTeam;
  location: string;
  activity: string;
  remarks: string;
  updatedAt: string;
  event?: string;
  hidden?: boolean;
  lat?: number;
  lng?: number;
};

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseDateKey(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

export function isBlockTeam(value: string): value is BlockTeam {
  return value === "usec" || value === "b" || value === "a" || value === "special";
}

export function noteId(date: string, team: BlockTeam) {
  return `${date}__${team}`;
}

export function findNote(notes: ActivityNote[], date: string, team: BlockTeam) {
  return notes.find((note) => note.date === date && note.team === team);
}

export function parseNoteId(id: string) {
  const separator = id.lastIndexOf("__");
  if (separator <= 0) return null;
  const date = id.slice(0, separator);
  const team = id.slice(separator + 2);
  if (!parseDateKey(date) || !isBlockTeam(team)) return null;
  return { date, team };
}

export function scheduledBlock(date: string, team: BlockTeam) {
  const parsed = parseDateKey(date);
  if (!parsed) return undefined;
  return getBlocksForMonth(parsed.year, parsed.monthIndex).find(
    (block) => block.team === team && parsed.day >= block.start && parsed.day <= block.end,
  );
}

export function isPrintedAssignment(date: string, team: BlockTeam) {
  return Boolean(scheduledBlock(date, team));
}

export function mergeNotes(notes: ActivityNote[]) {
  const visible = notes.filter((note) => !note.hidden);
  const location = [...new Set(visible.map((note) => (note.location ?? "").trim()).filter(Boolean))];
  const activity = [...new Set(visible.map((note) => note.activity.trim()).filter(Boolean))];
  const remarks = [...new Set(visible.map((note) => note.remarks.trim()).filter(Boolean))];
  const event = [...new Set(visible.map((note) => (note.event ?? "").trim()).filter(Boolean))];
  return {
    location: location.join(" · ") || undefined,
    activity: activity.join(" · ") || undefined,
    remarks: remarks.join(" · ") || undefined,
    event: event.join(" · ") || undefined,
  };
}

export function notesForBlock(
  notes: ActivityNote[],
  year: number,
  monthIndex: number,
  block: Pick<ScheduleBlock, "team" | "start" | "end">,
) {
  const matched: ActivityNote[] = [];
  for (let day = block.start; day <= block.end; day++) {
    const note = findNote(notes, toDateKey(year, monthIndex, day), block.team);
    if (note && !note.hidden) matched.push(note);
  }
  return mergeNotes(matched);
}

export const TEAM_OPTIONS: { value: BlockTeam; label: string }[] = [
  { value: "usec", label: "Team USEC" },
  { value: "b", label: "Team B" },
  { value: "a", label: "Team A" },
  { value: "special", label: "Special Event" },
];

export function teamLabel(team: BlockTeam | TeamKey) {
  return TEAM_OPTIONS.find((option) => option.value === team)?.label ?? team;
}

export function scheduledLocation(date: string, team: BlockTeam) {
  const match = scheduledBlock(date, team);
  return match?.place || match?.event || "";
}

export function scheduledEvent(date: string, team: BlockTeam) {
  return scheduledBlock(date, team)?.event || "";
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isBlockTeam,
  isPrintedAssignment,
  noteId,
  parseNoteId,
  scheduledEvent,
  scheduledLocation,
  type ActivityNote,
} from "./activity-notes";
import { resolveCoords } from "./geocode";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "activity-notes.json");

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf8");
  }
}

export async function readActivityNotes(): Promise<ActivityNote[]> {
  await ensureFile();
  const raw = await readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as ActivityNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((note) => {
      if (!note || typeof note.id !== "string" || typeof note.date !== "string" || !isBlockTeam(note.team)) {
        return false;
      }
      if (typeof note.location !== "string") note.location = "";
      if (typeof note.event !== "string") delete note.event;
      if (note.hidden !== true) delete note.hidden;
      return typeof note.activity === "string" && typeof note.remarks === "string";
    });
  } catch {
    return [];
  }
}

export async function writeActivityNotes(notes: ActivityNote[]) {
  await ensureFile();
  const sorted = [...notes].sort((a, b) => {
    if (a.date === b.date) return a.team.localeCompare(b.team);
    return a.date < b.date ? -1 : 1;
  });
  await writeFile(DATA_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return sorted;
}

export async function upsertActivityNote(input: {
  date: string;
  team: ActivityNote["team"];
  location: string;
  activity: string;
  remarks: string;
  event?: string;
  hidden?: boolean;
}) {
  const notes = await readActivityNotes();
  const id = noteId(input.date, input.team);
  const location = input.location.trim();
  const event = (input.event ?? "").trim();
  const previous = notes.find((note) => note.id === id);
  const coords = input.hidden
    ? previous?.lat != null && previous.lng != null
      ? { lat: previous.lat, lng: previous.lng }
      : undefined
    : previous && previous.location === location && previous.lat != null && previous.lng != null
      ? { lat: previous.lat, lng: previous.lng }
      : await resolveCoords(location);

  const next: ActivityNote = {
    id,
    date: input.date,
    team: input.team,
    location,
    activity: input.activity.trim(),
    remarks: input.remarks.trim(),
    updatedAt: new Date().toISOString(),
    ...(event ? { event } : {}),
    ...(input.hidden ? { hidden: true } : {}),
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  };
  const index = notes.findIndex((note) => note.id === id);
  if (index >= 0) notes[index] = next;
  else notes.push(next);
  await writeActivityNotes(notes);
  return next;
}

export async function deleteActivityNote(id: string) {
  const notes = await readActivityNotes();
  const next = notes.filter((note) => note.id !== id);
  await writeActivityNotes(next);
  return next;
}

export async function removeDashboardEntry(id: string) {
  const parsed = parseNoteId(id);
  if (!parsed) return deleteActivityNote(id);
  if (!isPrintedAssignment(parsed.date, parsed.team)) {
    return deleteActivityNote(id);
  }

  const notes = await readActivityNotes();
  const existing = notes.find((note) => note.id === id);
  await upsertActivityNote({
    date: parsed.date,
    team: parsed.team,
    location: existing?.location || scheduledLocation(parsed.date, parsed.team),
    activity: existing?.activity ?? "",
    remarks: existing?.remarks ?? "",
    event: existing?.event || scheduledEvent(parsed.date, parsed.team),
    hidden: true,
  });
  return readActivityNotes();
}

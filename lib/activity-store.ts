import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
const TMP_FILE = path.join(tmpdir(), "team-scheduler-activity-notes.json");

type NotesCache = { notes: ActivityNote[] | null };
const globalForNotes = globalThis as typeof globalThis & { __teamSchedulerNotes?: NotesCache };

function cache(): NotesCache {
  if (!globalForNotes.__teamSchedulerNotes) {
    globalForNotes.__teamSchedulerNotes = { notes: null };
  }
  return globalForNotes.__teamSchedulerNotes;
}

function normalizeNotes(parsed: unknown): ActivityNote[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((note): note is ActivityNote => {
    if (!note || typeof note.id !== "string" || typeof note.date !== "string" || !isBlockTeam(note.team)) {
      return false;
    }
    if (typeof note.location !== "string") note.location = "";
    if (typeof note.event !== "string") delete note.event;
    if (note.hidden !== true) delete note.hidden;
    return typeof note.activity === "string" && typeof note.remarks === "string";
  });
}

async function readFromPath(file: string): Promise<ActivityNote[] | null> {
  try {
    const raw = await readFile(file, "utf8");
    return normalizeNotes(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeToPath(file: string, payload: string) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, payload, "utf8");
}

export async function readActivityNotes(): Promise<ActivityNote[]> {
  const mem = cache();
  if (mem.notes) return mem.notes.map((note) => ({ ...note }));

  const loaded = (await readFromPath(DATA_FILE)) ?? (await readFromPath(TMP_FILE)) ?? [];
  mem.notes = loaded;
  return loaded.map((note) => ({ ...note }));
}

export async function writeActivityNotes(notes: ActivityNote[]) {
  const sorted = [...notes].sort((a, b) => {
    if (a.date === b.date) return a.team.localeCompare(b.team);
    return a.date < b.date ? -1 : 1;
  });
  cache().notes = sorted.map((note) => ({ ...note }));
  const payload = `${JSON.stringify(sorted, null, 2)}\n`;

  const writes = await Promise.allSettled([writeToPath(DATA_FILE, payload), writeToPath(TMP_FILE, payload)]);
  const persisted = writes.some((result) => result.status === "fulfilled");
  if (!persisted) {
    console.warn("activity-notes: disk is read-only; keeping changes in memory for this server.");
  }
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
  const notes = await readActivityNotes();
  const existing = notes.find((note) => note.id === id);
  if (existing) {
    return deleteActivityNote(id);
  }

  const parsed = parseNoteId(id);
  if (parsed && isPrintedAssignment(parsed.date, parsed.team)) {
    await upsertActivityNote({
      date: parsed.date,
      team: parsed.team,
      location: scheduledLocation(parsed.date, parsed.team),
      activity: "",
      remarks: "",
      event: scheduledEvent(parsed.date, parsed.team),
      hidden: true,
    });
    return readActivityNotes();
  }

  return notes;
}

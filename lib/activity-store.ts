import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  isBlockTeam,
  isPrintedAssignment,
  noteId,
  parseDateKey,
  parseNoteId,
  scheduledEvent,
  scheduledLocation,
  type ActivityNote,
} from "./activity-notes";
import { resolveCoords } from "./geocode";
import { getSupabase, getSupabaseWriter, isSupabaseConfigured, isSupabaseWriterConfigured } from "./supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "activity-notes.json");
const TMP_FILE = path.join(tmpdir(), "team-scheduler-activity-notes.json");

type NotesCache = { notes: ActivityNote[] | null };
const globalForNotes = globalThis as typeof globalThis & { __teamSchedulerNotes?: NotesCache };

export type ActivityNoteRow = {
  id: string;
  date: string;
  team: string;
  location: string;
  activity: string;
  remarks: string;
  event: string | null;
  hidden: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string;
};

function cache(): NotesCache {
  if (!globalForNotes.__teamSchedulerNotes) {
    globalForNotes.__teamSchedulerNotes = { notes: null };
  }
  return globalForNotes.__teamSchedulerNotes;
}

export function toDateOnly(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? value.trim();
}

function normalizeNotes(parsed: unknown): ActivityNote[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((note): note is ActivityNote => {
    if (!note || typeof note.id !== "string" || typeof note.date !== "string" || !isBlockTeam(note.team)) {
      return false;
    }
    note.date = toDateOnly(note.date);
    if (!parseDateKey(note.date)) return false;
    if (typeof note.location !== "string") note.location = "";
    if (typeof note.event !== "string") delete note.event;
    if (note.hidden !== true) delete note.hidden;
    return typeof note.activity === "string" && typeof note.remarks === "string";
  });
}

export function rowToNote(row: ActivityNoteRow): ActivityNote | null {
  if (!isBlockTeam(row.team)) return null;
  const date = toDateOnly(row.date);
  if (!parseDateKey(date)) return null;
  return {
    id: row.id,
    date,
    team: row.team,
    location: row.location ?? "",
    activity: row.activity ?? "",
    remarks: row.remarks ?? "",
    updatedAt: row.updated_at,
    ...(row.event ? { event: row.event } : {}),
    ...(row.hidden ? { hidden: true } : {}),
    ...(row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : {}),
  };
}

export function noteToRow(note: ActivityNote): ActivityNoteRow {
  return {
    id: note.id,
    date: toDateOnly(note.date),
    team: note.team,
    location: note.location,
    activity: note.activity,
    remarks: note.remarks,
    event: note.event?.trim() ? note.event : null,
    hidden: Boolean(note.hidden),
    lat: note.lat ?? null,
    lng: note.lng ?? null,
    updated_at: note.updatedAt,
  };
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

async function readLocalNotes(): Promise<ActivityNote[]> {
  const mem = cache();
  if (mem.notes) return mem.notes.map((note) => ({ ...note }));
  const loaded = (await readFromPath(DATA_FILE)) ?? (await readFromPath(TMP_FILE)) ?? [];
  mem.notes = loaded;
  return loaded.map((note) => ({ ...note }));
}

async function writeLocalNotes(notes: ActivityNote[]) {
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

async function readSupabaseNotes(): Promise<ActivityNote[]> {
  const { data, error } = await getSupabase()
    .from("activity_notes")
    .select("id, date, team, location, activity, remarks, event, hidden, lat, lng, updated_at")
    .order("date", { ascending: true })
    .order("team", { ascending: true });

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => rowToNote(row as ActivityNoteRow))
    .filter((note): note is ActivityNote => Boolean(note));
}

function assertPersistentStorageAvailable() {
  if (isSupabaseWriterConfigured()) return;
  if (isSupabaseConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for saving activities. Add it to .env.local and your hosting environment.",
    );
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(
      "Supabase is not configured for production. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

export async function readLocalActivityNotesFile(): Promise<ActivityNote[]> {
  return (await readFromPath(DATA_FILE)) ?? [];
}

export async function migrateLocalActivityNotes() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const local = await readLocalActivityNotesFile();
  if (!local.length) {
    return { migrated: 0, notes: await readSupabaseNotes() };
  }
  const { error } = await getSupabaseWriter().from("activity_notes").upsert(local.map(noteToRow), { onConflict: "id" });
  if (error) {
    throw new Error(`Supabase migrate failed: ${error.message}`);
  }
  return { migrated: local.length, notes: await readSupabaseNotes() };
}

export async function readActivityNotes(): Promise<ActivityNote[]> {
  if (isSupabaseConfigured()) {
    return readSupabaseNotes();
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(
      "Supabase is not configured for production reads. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return readLocalNotes();
}

export async function writeActivityNotes(notes: ActivityNote[]) {
  const sorted = [...notes].sort((a, b) => {
    if (a.date === b.date) return a.team.localeCompare(b.team);
    return a.date < b.date ? -1 : 1;
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseWriter();
    const { data: current, error: readError } = await supabase.from("activity_notes").select("id");
    if (readError) throw new Error(`Supabase read failed: ${readError.message}`);

    const keep = new Set(sorted.map((note) => note.id));
    const stale = (current ?? []).map((row) => row.id as string).filter((id) => !keep.has(id));
    if (stale.length) {
      const { error: deleteError } = await supabase.from("activity_notes").delete().in("id", stale);
      if (deleteError) throw new Error(`Supabase delete failed: ${deleteError.message}`);
    }

    if (sorted.length) {
      const { error: upsertError } = await supabase.from("activity_notes").upsert(sorted.map(noteToRow), { onConflict: "id" });
      if (upsertError) throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }
    return sorted;
  }

  return writeLocalNotes(sorted);
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
  const date = toDateOnly(input.date);
  if (!parseDateKey(date)) {
    throw new Error("Enter a valid date.");
  }
  const notes = await readActivityNotes();
  const id = noteId(date, input.team);
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
    date,
    team: input.team,
    location,
    activity: input.activity.trim(),
    remarks: input.remarks.trim(),
    updatedAt: new Date().toISOString(),
    ...(event ? { event } : {}),
    ...(input.hidden ? { hidden: true } : {}),
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  };

  if (isSupabaseConfigured()) {
    assertPersistentStorageAvailable();
    const supabase = getSupabaseWriter();
    const { error } = await supabase.from("activity_notes").upsert(noteToRow(next), { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

    const { data: verified, error: verifyError } = await getSupabase()
      .from("activity_notes")
      .select("id, date, team, location, activity, remarks, event, hidden, lat, lng, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (verifyError) {
      throw new Error(`Supabase verify failed after save: ${verifyError.message}`);
    }
    const saved = verified ? rowToNote(verified as ActivityNoteRow) : null;
    if (!saved) {
      throw new Error("Save appeared to succeed but the activity could not be read back from Supabase.");
    }
    return saved;
  }

  assertPersistentStorageAvailable();

  const index = notes.findIndex((note) => note.id === id);
  if (index >= 0) notes[index] = next;
  else notes.push(next);
  await writeLocalNotes(notes);
  return next;
}

export async function deleteActivityNote(id: string) {
  if (isSupabaseConfigured()) {
    assertPersistentStorageAvailable();
    const { error } = await getSupabaseWriter().from("activity_notes").delete().eq("id", id);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
    return readSupabaseNotes();
  }
  assertPersistentStorageAvailable();
  const notes = await readLocalNotes();
  const next = notes.filter((note) => note.id !== id);
  await writeLocalNotes(next);
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

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
  type ActivityReportImage,
} from "./activity-notes";
import { listActivityReportImages, copyActivityReportImages, removeActivityReportFolder, readRosterOverrides, writeRosterOverride, removeRosterOverride } from "./activity-report-storage";
import { resolveCoords } from "./geocode";
import { getSupabase, getSupabaseWriter, isSupabaseConfigured, isSupabaseWriterConfigured, supabaseConfigHint } from "./supabase";

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
  members?: ActivityNote["members"] | null;
  report_images?: ActivityReportImage[] | null;
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

function normalizeReportImages(value: unknown): ActivityNote["reportImages"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url.trim() : "";
      const imagePath = typeof row.path === "string" ? row.path.trim() : "";
      if (!url || !imagePath) return null;
      const name = typeof row.name === "string" ? row.name.trim() : imagePath.split("/").pop() || "photo";
      return { path: imagePath, url, name };
    })
    .filter((entry): entry is ActivityReportImage => Boolean(entry));
  return images.length ? images : undefined;
}

type ExtraColumns = { members: boolean; reportImages: boolean };
let extraColumns: ExtraColumns | null = null;

async function probeExtraColumns(force = false): Promise<ExtraColumns> {
  if (extraColumns && !force) return extraColumns;
  if (!isSupabaseConfigured()) {
    extraColumns = { members: true, reportImages: true };
    return extraColumns;
  }
  const supabase = getSupabase();
  const [members, reportImages] = await Promise.all([
    supabase.from("activity_notes").select("members").limit(1),
    supabase.from("activity_notes").select("report_images").limit(1),
  ]);
  extraColumns = {
    members: !members.error,
    reportImages: !reportImages.error,
  };
  return extraColumns;
}

export function resetActivityNoteColumnCache() {
  extraColumns = null;
}

function normalizeMembers(value: unknown): ActivityNote["members"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const members = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `member-${index}`;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const photo = typeof row.photo === "string" ? row.photo.trim() : "";
      return {
        id,
        name,
        ...(title ? { title } : {}),
        ...(photo ? { photo } : {}),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return members.length ? members : undefined;
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
    const members = normalizeMembers(note.members);
    if (members) note.members = members;
    else delete note.members;
    const reportImages = normalizeReportImages(note.reportImages);
    if (reportImages) note.reportImages = reportImages;
    else delete note.reportImages;
    return typeof note.activity === "string" && typeof note.remarks === "string";
  });
}

export function rowToNote(row: ActivityNoteRow): ActivityNote | null {
  if (!isBlockTeam(row.team)) return null;
  const date = toDateOnly(row.date);
  if (!parseDateKey(date)) return null;
  const members = normalizeMembers(row.members);
  const reportImages = normalizeReportImages(row.report_images);
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
    ...(members ? { members } : {}),
    ...(reportImages ? { reportImages } : {}),
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
    members: note.members?.length ? note.members : null,
    report_images: note.reportImages?.length ? note.reportImages : [],
    updated_at: note.updatedAt,
  };
}

async function persistableRow(note: ActivityNote) {
  const row = noteToRow(note);
  const extra = await probeExtraColumns();
  const payload: Record<string, unknown> = { ...row };
  if (!extra.members) delete payload.members;
  if (!extra.reportImages) delete payload.report_images;
  return payload;
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

async function applyRosterOverrides(notes: ActivityNote[]): Promise<ActivityNote[]> {
  const overrides = await readRosterOverrides();
  return notes.map((note) => {
    if (note.members?.length) return note;
    const members = normalizeMembers(overrides[note.id]);
    return members ? { ...note, members } : note;
  });
}

async function readSupabaseNotes(): Promise<ActivityNote[]> {
  const { data, error } = await getSupabase()
    .from("activity_notes")
    .select("*")
    .order("date", { ascending: true })
    .order("team", { ascending: true });

  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }

  return applyRosterOverrides(
    (data ?? [])
      .map((row) => rowToNote(row as ActivityNoteRow))
      .filter((note): note is ActivityNote => Boolean(note)),
  );
}

export async function readActivityNote(id: string): Promise<ActivityNote | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from("activity_notes").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    const note = data ? rowToNote(data as ActivityNoteRow) : null;
    if (!note) return null;
    const [hydrated] = await applyRosterOverrides([note]);
    return hydrated ?? note;
  }
  const notes = await readLocalNotes();
  return notes.find((note) => note.id === id) ?? null;
}

export async function resolveReportImages(id: string): Promise<ActivityReportImage[]> {
  const note = await readActivityNote(id);
  if (note?.reportImages?.length) return note.reportImages;
  return listActivityReportImages(id);
}

function assertPersistentStorageAvailable() {
  if (isSupabaseWriterConfigured()) return;
  if (isSupabaseConfigured()) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY is required for saving activities. ${supabaseConfigHint()}`);
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(`Supabase is not configured for production. ${supabaseConfigHint()}`);
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
  const rows = await Promise.all(local.map((note) => persistableRow(note)));
  const { error } = await getSupabaseWriter().from("activity_notes").upsert(rows, { onConflict: "id" });
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
    throw new Error(`Supabase is not configured for production reads. ${supabaseConfigHint()}`);
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
      const rows = await Promise.all(sorted.map((note) => persistableRow(note)));
      const { error: upsertError } = await supabase.from("activity_notes").upsert(rows, { onConflict: "id" });
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
  members?: ActivityNote["members"] | null;
  reportImages?: ActivityNote["reportImages"] | null;
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

  const members =
    input.members === null
      ? undefined
      : input.members !== undefined
        ? normalizeMembers(input.members)
        : previous?.members;

  const reportImagesInput =
    input.reportImages === null
      ? undefined
      : input.reportImages !== undefined
        ? normalizeReportImages(input.reportImages)
        : previous?.reportImages;
  const reportImages =
    reportImagesInput?.length && isSupabaseWriterConfigured()
      ? await copyActivityReportImages(reportImagesInput[0]?.path.split("/")[0] || id, id, reportImagesInput)
      : reportImagesInput;

  const extra = await probeExtraColumns(Boolean(members || input.members === null));
  if (input.members !== undefined && !extra.members) {
    await writeRosterOverride(id, members ?? null);
  } else if (extra.members && input.members !== undefined) {
    await removeRosterOverride(id).catch(() => undefined);
  }

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
    ...(members ? { members } : {}),
    ...(reportImages ? { reportImages } : {}),
  };

  if (isSupabaseConfigured()) {
    assertPersistentStorageAvailable();
    const supabase = getSupabaseWriter();
    const { error } = await supabase.from("activity_notes").upsert(await persistableRow(next), { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

    const { data: verified, error: verifyError } = await getSupabase()
      .from("activity_notes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (verifyError) {
      throw new Error(`Supabase verify failed after save: ${verifyError.message}`);
    }
    const saved = verified ? rowToNote(verified as ActivityNoteRow) : null;
    if (!saved) {
      throw new Error("Save appeared to succeed but the activity could not be read back from Supabase.");
    }
    if (!saved.reportImages?.length && next.reportImages?.length) {
      saved.reportImages = next.reportImages;
    }
    if (next.members?.length && !saved.members?.length) {
      saved.members = next.members;
    }
    if (input.members === null) delete saved.members;
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
    await removeActivityReportFolder(id).catch(() => undefined);
    await removeRosterOverride(id).catch(() => undefined);
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

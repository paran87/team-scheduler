import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ACTIVITY_REPORT_BUCKET,
  extensionForType,
  ensureActivityReportBucket,
  REPORT_IMAGE_TYPES,
  sanitizeFileName,
} from "./activity-report-storage";
import { getSupabase, getSupabaseWriter, isSupabaseConfigured, isSupabaseWriterConfigured } from "./supabase";
import {
  isTeamKey,
  setExtraRosterMembers,
  type ExtraRosterMember,
} from "./team-roster";
import type { TeamKey } from "./types";

export const MAX_ROSTER_PHOTO_BYTES = 4 * 1024 * 1024;
const ROSTER_JSON_PATH = "_team-roster.json";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "team-roster.json");
const TMP_FILE = path.join(tmpdir(), "team-scheduler-team-roster.json");
const PHOTO_DIR = path.join(DATA_DIR, "roster-photos");
const LOCAL_PHOTO_PREFIX = "local:";

type RosterCache = { members: ExtraRosterMember[] | null };
const globalForRoster = globalThis as typeof globalThis & { __teamSchedulerRoster?: RosterCache };

function cache(): RosterCache {
  if (!globalForRoster.__teamSchedulerRoster) {
    globalForRoster.__teamSchedulerRoster = { members: null };
  }
  return globalForRoster.__teamSchedulerRoster;
}

function newMemberId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMembers(value: unknown): ExtraRosterMember[] {
  if (!value || typeof value !== "object") return [];
  const rows = Array.isArray(value) ? value : Array.isArray((value as { members?: unknown }).members)
    ? (value as { members: unknown[] }).members
    : [];
  return rows
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const team = typeof row.team === "string" ? row.team : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!isTeamKey(team) || !name) return null;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : newMemberId();
      const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Team Member";
      const photo = typeof row.photo === "string" ? row.photo.trim() : "";
      const photoPath = typeof row.photoPath === "string" ? row.photoPath.trim() : "";
      return {
        id,
        team,
        name,
        title,
        ...(photo ? { photo } : {}),
        ...(photoPath ? { photoPath } : {}),
      };
    })
    .filter((entry): entry is ExtraRosterMember => Boolean(entry));
}

async function readFromPath(file: string): Promise<ExtraRosterMember[] | null> {
  try {
    const raw = await readFile(file, "utf8");
    return normalizeMembers(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeToPath(file: string, payload: string) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, payload, "utf8");
}

async function readLocalMembers(): Promise<ExtraRosterMember[]> {
  const mem = cache();
  if (mem.members) return mem.members.map((member) => ({ ...member }));
  const loaded = (await readFromPath(DATA_FILE)) ?? (await readFromPath(TMP_FILE)) ?? [];
  mem.members = loaded;
  return loaded.map((member) => ({ ...member }));
}

async function writeLocalMembers(members: ExtraRosterMember[]) {
  cache().members = members.map((member) => ({ ...member }));
  const payload = `${JSON.stringify({ members }, null, 2)}\n`;
  const writes = await Promise.allSettled([writeToPath(DATA_FILE, payload), writeToPath(TMP_FILE, payload)]);
  const persisted = writes.some((result) => result.status === "fulfilled");
  if (!persisted) {
    console.warn("team-roster: disk is read-only; keeping changes in memory for this server.");
  }
  return members;
}

function localPhotoUrl(id: string) {
  return `/api/team-roster/photo/${encodeURIComponent(id)}`;
}

async function uploadRosterPhoto(team: TeamKey, id: string, file: File) {
  const ext = extensionForType(file.type);
  const fileName = sanitizeFileName(file.name || `photo.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isSupabaseWriterConfigured()) {
    await ensureActivityReportBucket();
    const photoPath = `roster/${team}/${id}-${fileName}`;
    const supabase = getSupabaseWriter();
    const { error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).upload(photoPath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    const { data } = supabase.storage.from(ACTIVITY_REPORT_BUCKET).getPublicUrl(photoPath);
    return { photo: data.publicUrl, photoPath };
  }

  await mkdir(PHOTO_DIR, { recursive: true });
  const storedName = `${id}.${ext}`;
  await writeFile(path.join(PHOTO_DIR, storedName), buffer);
  return { photo: localPhotoUrl(id), photoPath: `${LOCAL_PHOTO_PREFIX}${storedName}` };
}

async function removeRosterPhoto(member: ExtraRosterMember) {
  if (!member.photoPath) return;
  if (member.photoPath.startsWith(LOCAL_PHOTO_PREFIX)) {
    const fileName = member.photoPath.slice(LOCAL_PHOTO_PREFIX.length);
    await unlink(path.join(PHOTO_DIR, fileName)).catch(() => undefined);
    return;
  }
  if (isSupabaseWriterConfigured()) {
    await getSupabaseWriter().storage.from(ACTIVITY_REPORT_BUCKET).remove([member.photoPath]).catch(() => undefined);
  }
}

async function readSupabaseMembers(): Promise<ExtraRosterMember[]> {
  const supabase = isSupabaseWriterConfigured() ? getSupabaseWriter() : getSupabase();
  const { data, error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).download(ROSTER_JSON_PATH);
  if (error || !data) return [];
  return normalizeMembers(JSON.parse(await data.text()));
}

async function writeSupabaseMembers(members: ExtraRosterMember[]) {
  await ensureActivityReportBucket();
  const payload = JSON.stringify({ members });
  const { error } = await getSupabaseWriter()
    .storage.from(ACTIVITY_REPORT_BUCKET)
    .upload(ROSTER_JSON_PATH, payload, { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`Could not save team roster: ${error.message}`);
  cache().members = members.map((member) => ({ ...member }));
}

export async function readExtraRosterMembers(): Promise<ExtraRosterMember[]> {
  const members = isSupabaseConfigured() ? await readSupabaseMembers() : await readLocalMembers();
  setExtraRosterMembers(members);
  return members;
}

export async function addExtraRosterMember(input: {
  team: TeamKey;
  name: string;
  title?: string;
  file?: File | null;
}): Promise<ExtraRosterMember[]> {
  const name = input.name.trim();
  if (!name) throw new Error("Enter the member's name.");
  const members = await readExtraRosterMembers();
  const duplicate = members.some(
    (member) => member.team === input.team && member.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) throw new Error("That name is already on this team's roster.");

  const id = newMemberId();
  let photo: string | undefined;
  let photoPath: string | undefined;
  if (input.file && input.file.size) {
    if (input.file.size > MAX_ROSTER_PHOTO_BYTES) {
      throw new Error("Each photo must be 4 MB or smaller.");
    }
    if (input.file.type && !REPORT_IMAGE_TYPES.has(input.file.type)) {
      throw new Error("Upload a JPG, PNG, WEBP, or GIF photo.");
    }
    const uploaded = await uploadRosterPhoto(input.team, id, input.file);
    photo = uploaded.photo;
    photoPath = uploaded.photoPath;
  }

  const next: ExtraRosterMember = {
    id,
    team: input.team,
    name,
    title: input.title?.trim() || "Team Member",
    ...(photo ? { photo } : {}),
    ...(photoPath ? { photoPath } : {}),
  };
  const updated = [...members, next];
  if (isSupabaseConfigured()) {
    if (!isSupabaseWriterConfigured()) {
      throw new Error("Supabase service role is required to save team members.");
    }
    await writeSupabaseMembers(updated);
  } else {
    await writeLocalMembers(updated);
  }
  setExtraRosterMembers(updated);
  return updated;
}

export async function removeExtraRosterMember(id: string): Promise<ExtraRosterMember[]> {
  const members = await readExtraRosterMembers();
  const existing = members.find((member) => member.id === id);
  if (!existing) return members;
  await removeRosterPhoto(existing);
  const updated = members.filter((member) => member.id !== id);
  if (isSupabaseConfigured()) {
    if (!isSupabaseWriterConfigured()) {
      throw new Error("Supabase service role is required to save team members.");
    }
    await writeSupabaseMembers(updated);
  } else {
    await writeLocalMembers(updated);
  }
  setExtraRosterMembers(updated);
  return updated;
}

export async function readLocalRosterPhoto(id: string): Promise<{ buffer: Buffer; type: string } | null> {
  const members = await readExtraRosterMembers();
  const member = members.find((entry) => entry.id === id);
  if (!member?.photoPath?.startsWith(LOCAL_PHOTO_PREFIX)) return null;
  const fileName = member.photoPath.slice(LOCAL_PHOTO_PREFIX.length);
  try {
    const buffer = await readFile(path.join(PHOTO_DIR, fileName));
    const ext = path.extname(fileName).slice(1).toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
    return { buffer, type };
  } catch {
    return null;
  }
}

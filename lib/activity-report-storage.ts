import type { ActivityMember, ActivityReportImage } from "./activity-notes";
import { getSupabase, getSupabaseWriter, isSupabaseConfigured, isSupabaseWriterConfigured } from "./supabase";

export const ACTIVITY_REPORT_BUCKET = "activity-reports";
export const MAX_REPORT_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_REPORT_IMAGES = 12;
export const REPORT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const BUCKET_MIME_TYPES = [...REPORT_IMAGE_TYPES, "application/json", "text/plain"];

let bucketReady = false;

function sanitizeFileName(name: string) {
  const trimmed = name.trim() || "photo";
  const lastDot = trimmed.lastIndexOf(".");
  const stem = (lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1).replace(/[^a-zA-Z0-9]+/g, "").slice(0, 8) : "jpg";
  return `${(stem || "photo").slice(0, 60)}.${ext || "jpg"}`;
}

export function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function ensureActivityReportBucket() {
  if (bucketReady) return;
  if (!isSupabaseWriterConfigured()) {
    throw new Error("Supabase service role is required to upload activity report photos.");
  }
  const supabase = getSupabaseWriter();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Could not list storage buckets: ${error.message}`);
  }
  const exists = (data ?? []).some((bucket) => bucket.id === ACTIVITY_REPORT_BUCKET || bucket.name === ACTIVITY_REPORT_BUCKET);
  if (!exists) {
    const created = await supabase.storage.createBucket(ACTIVITY_REPORT_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_REPORT_IMAGE_BYTES}`,
      allowedMimeTypes: BUCKET_MIME_TYPES,
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(`Could not create storage bucket: ${created.error.message}`);
    }
  } else {
    const updated = await supabase.storage.updateBucket(ACTIVITY_REPORT_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_REPORT_IMAGE_BYTES}`,
      allowedMimeTypes: BUCKET_MIME_TYPES,
    });
    if (updated.error && !/already exists/i.test(updated.error.message)) {
      throw new Error(`Could not update storage bucket: ${updated.error.message}`);
    }
  }
  bucketReady = true;
}

export async function uploadActivityReportImage(noteId: string, file: File): Promise<ActivityReportImage> {
  await ensureActivityReportBucket();
  const supabase = getSupabaseWriter();
  const fileName = sanitizeFileName(file.name || `photo.${extensionForType(file.type)}`);
  const path = `${noteId}/${Date.now()}-${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(ACTIVITY_REPORT_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, name: fileName };
}

export async function removeActivityReportImage(path: string) {
  if (!isSupabaseWriterConfigured()) return;
  await ensureActivityReportBucket();
  const { error } = await getSupabaseWriter().storage.from(ACTIVITY_REPORT_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Could not remove photo: ${error.message}`);
  }
}

export async function listActivityReportImages(noteId: string): Promise<ActivityReportImage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = isSupabaseWriterConfigured() ? getSupabaseWriter() : getSupabase();
  const { data, error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).list(noteId, {
    limit: MAX_REPORT_IMAGES,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data) return [];
  return data
    .filter((entry) => entry.name && !entry.name.endsWith("/"))
    .map((entry) => {
      const path = `${noteId}/${entry.name}`;
      const { data: publicUrl } = supabase.storage.from(ACTIVITY_REPORT_BUCKET).getPublicUrl(path);
      return { path, url: publicUrl.publicUrl, name: entry.name };
    });
}

export async function copyActivityReportImages(fromNoteId: string, toNoteId: string, images: ActivityReportImage[]) {
  if (fromNoteId === toNoteId || !images.length || !isSupabaseWriterConfigured()) return images;
  await ensureActivityReportBucket();
  const supabase = getSupabaseWriter();
  const copied: ActivityReportImage[] = [];
  for (const image of images) {
    const fileName = image.path.split("/").pop() || image.name;
    const nextPath = `${toNoteId}/${fileName}`;
    if (image.path.startsWith(`${toNoteId}/`)) {
      copied.push(image);
      continue;
    }
    const { error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).copy(image.path, nextPath);
    if (error) {
      copied.push(image);
      continue;
    }
    const { data } = supabase.storage.from(ACTIVITY_REPORT_BUCKET).getPublicUrl(nextPath);
    copied.push({ path: nextPath, url: data.publicUrl, name: image.name || fileName });
  }
  return copied;
}

export async function removeActivityReportFolder(noteId: string) {
  if (!isSupabaseWriterConfigured()) return;
  const images = await listActivityReportImages(noteId);
  if (!images.length) return;
  await getSupabaseWriter().storage.from(ACTIVITY_REPORT_BUCKET).remove(images.map((image) => image.path));
}

const ROSTER_OVERRIDE_PATH = "_roster-overrides.json";
let rosterOverrideCache: Record<string, ActivityMember[]> | null = null;

export async function readRosterOverrides(): Promise<Record<string, ActivityMember[]>> {
  if (rosterOverrideCache) return rosterOverrideCache;
  if (!isSupabaseConfigured()) {
    rosterOverrideCache = {};
    return rosterOverrideCache;
  }
  try {
    const supabase = isSupabaseWriterConfigured() ? getSupabaseWriter() : getSupabase();
    const { data, error } = await supabase.storage.from(ACTIVITY_REPORT_BUCKET).download(ROSTER_OVERRIDE_PATH);
    if (error || !data) {
      rosterOverrideCache = {};
      return rosterOverrideCache;
    }
    const parsed = JSON.parse(await data.text()) as unknown;
    rosterOverrideCache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, ActivityMember[]>) : {};
    return rosterOverrideCache;
  } catch {
    rosterOverrideCache = {};
    return rosterOverrideCache;
  }
}

export async function writeRosterOverride(noteId: string, members: ActivityMember[] | null) {
  if (!isSupabaseWriterConfigured()) {
    throw new Error("Supabase service role is required to save team composition.");
  }
  bucketReady = false;
  await ensureActivityReportBucket();
  const current = { ...(await readRosterOverrides()) };
  if (!members?.length) delete current[noteId];
  else current[noteId] = members;
  const payload = JSON.stringify(current);
  const { error } = await getSupabaseWriter()
    .storage.from(ACTIVITY_REPORT_BUCKET)
    .upload(ROSTER_OVERRIDE_PATH, payload, { upsert: true, contentType: "application/json" });
  if (error) {
    throw new Error(`Could not save team composition: ${error.message}`);
  }
  rosterOverrideCache = current;
}

export async function removeRosterOverride(noteId: string) {
  const current = await readRosterOverrides();
  if (!(noteId in current)) return;
  await writeRosterOverride(noteId, null);
}

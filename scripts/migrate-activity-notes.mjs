import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("Could not read .env.local");
    process.exit(1);
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !publishableKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable key in .env.local");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (required for migration writes).");
  process.exit(1);
}

const notes = JSON.parse(readFileSync(path.join(process.cwd(), "data", "activity-notes.json"), "utf8"));
const rows = notes.map((note) => ({
  id: note.id,
  date: String(note.date).slice(0, 10),
  team: note.team,
  location: note.location ?? "",
  activity: note.activity ?? "",
  remarks: note.remarks ?? "",
  event: note.event || null,
  hidden: Boolean(note.hidden),
  lat: note.lat ?? null,
  lng: note.lng ?? null,
  updated_at: note.updatedAt,
}));

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await supabase.from("activity_notes").upsert(rows, { onConflict: "id" });
if (error) {
  console.error("MIGRATE_FAILED", error.message);
  process.exit(1);
}

const { data, error: readError } = await supabase
  .from("activity_notes")
  .select("id, date, team, hidden, lat, lng")
  .order("date");
if (readError) {
  console.error("READ_FAILED", readError.message);
  process.exit(1);
}

console.log(JSON.stringify({ migrated: rows.length, rows: data }, null, 2));

// One-time script to allow 'guest' as a team value in the activity_notes table.
// Usage (from the project root): node scripts/apply-guest-migration.mjs
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function loadEnv() {
  const env = {};
  for (const name of [".env.local", ".env"]) {
    try {
      const raw = await readFile(resolve(ROOT, name), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!env[key]) env[key] = val; // first file wins
      }
    } catch { /* file may not exist */ }
  }
  return env;
}

const SQL = [
  "alter table public.activity_notes drop constraint if exists activity_notes_team_check;",
  "alter table public.activity_notes add constraint activity_notes_team_check check (team in ('usec', 'b', 'a', 'special', 'guest'));",
].join("\n");

async function main() {
  const env = await loadEnv();
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !key) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.error("ROOT looked in:", ROOT);
    process.exit(1);
  }

  const projectRef = url.replace(/^https?:\/\//, "").replace(/\.supabase\.co.*$/, "");
  console.log("Project ref:", projectRef);
  console.log("Applying migration...");

  // Try Supabase Management API
  let res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: SQL }),
  });

  if (res.ok) {
    console.log("✅ Migration applied via Supabase Management API!");
    return;
  }

  const mgmtBody = await res.text().catch(() => "");
  console.log(`Management API ${res.status}: ${mgmtBody}`);

  // Fallback: exec_sql RPC (requires the function to exist in the DB)
  res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (res.ok) {
    console.log("✅ Migration applied via exec_sql RPC!");
    return;
  }

  const rpcBody = await res.text().catch(() => "");
  console.log(`exec_sql RPC ${res.status}: ${rpcBody}`);
  console.log("\n⚠️  Could not apply migration automatically.");
  console.log("Please run this SQL in the Supabase SQL editor:");
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log("\n" + SQL);
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
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
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
    return;
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log("=== Activity Report/MOM Supabase setup ===\n");

  const schemaSql = `
alter table public.activity_notes add column if not exists members jsonb;
alter table public.activity_notes add column if not exists report_images jsonb not null default '[]'::jsonb;
`.trim();

  const sqlEndpoints = [`${url}/pg/query`, `${url}/pg-meta/query`, `${url}/postgres/v1/query`];
  let sqlApplied = false;
  for (const endpoint of sqlEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: schemaSql }),
      });
      if (response.ok) {
        pass(`Applied report columns via ${new URL(endpoint).pathname}`);
        sqlApplied = true;
        break;
      }
    } catch {
      /* try the next SQL endpoint */
    }
  }
  if (!sqlApplied) {
    console.log("INFO: Could not apply SQL automatically. Columns will be probed next; run the migration in the Supabase SQL Editor if they are missing.");
  }

  const membersProbe = await supabase.from("activity_notes").select("members").limit(1);
  if (membersProbe.error) {
    fail(`Column members is missing (${membersProbe.error.message}). Run supabase/migrations/20260905213000_activity_report_images.sql in the SQL Editor.`);
  } else {
    pass("Column members exists");
  }

  const imagesProbe = await supabase.from("activity_notes").select("report_images").limit(1);
  if (imagesProbe.error) {
    fail(`Column report_images is missing (${imagesProbe.error.message}). Run supabase/migrations/20260905213000_activity_report_images.sql in the SQL Editor.`);
  } else {
    pass("Column report_images exists");
  }

  const buckets = await supabase.storage.listBuckets();
  if (buckets.error) {
    fail(`Could not list storage buckets: ${buckets.error.message}`);
  } else {
    const exists = (buckets.data ?? []).some((bucket) => bucket.id === "activity-reports" || bucket.name === "activity-reports");
    if (!exists) {
      const created = await supabase.storage.createBucket("activity-reports", {
        public: true,
        fileSizeLimit: "4194304",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      });
      if (created.error) {
        fail(`Could not create activity-reports bucket: ${created.error.message}`);
      } else {
        pass("Created public storage bucket activity-reports");
      }
    } else {
      pass("Storage bucket activity-reports already exists");
    }
  }

  const publicUrl = supabase.storage.from("activity-reports").getPublicUrl("healthcheck.txt");
  if (publicUrl.data?.publicUrl) {
    pass(`Public photo URL pattern ready (${new URL(publicUrl.data.publicUrl).origin})`);
  }

  console.log("\n=== Done ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

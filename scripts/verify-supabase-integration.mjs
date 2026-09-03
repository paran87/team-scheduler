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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !publishableKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL and publishable key are required in .env.local");
    return;
  }

  const reader = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const testId = "2026-09-07__verify-test";

  console.log("=== Supabase integration verification ===\n");

  const tableProbe = await reader.from("activity_notes").select("id").limit(1);
  if (tableProbe.error) {
    fail(`Table public.activity_notes is not reachable: ${tableProbe.error.message}`);
    console.log("\nRun supabase/schema.sql in the Supabase SQL Editor first.");
  } else {
    pass("Table public.activity_notes exists and is readable with the publishable key");
  }

  if (!serviceRoleKey) {
    fail("SUPABASE_SERVICE_ROLE_KEY is missing — writes cannot be verified");
    console.log("\nAdd SUPABASE_SERVICE_ROLE_KEY to .env.local from Supabase → Project Settings → API.");
    return;
  }

  const writer = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const upsert = await writer.from("activity_notes").upsert(
    {
      id: testId,
      date: "2026-09-07",
      team: "a",
      location: "Central Office/Pasig City",
      activity: "Supabase verify test",
      remarks: "temporary row",
      event: null,
      hidden: false,
      lat: 14.5764,
      lng: 121.0851,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (upsert.error) {
    fail(`Upsert failed: ${upsert.error.message}`);
  } else {
    pass("CREATE/UPSERT works with service role key");
  }

  const readBack = await reader.from("activity_notes").select("*").eq("id", testId).maybeSingle();
  if (readBack.error) {
    fail(`Read-back failed: ${readBack.error.message}`);
  } else if (!readBack.data || readBack.data.date !== "2026-09-07") {
    fail(`Date mismatch after read-back: ${readBack.data?.date ?? "missing"}`);
  } else if (readBack.data.lat !== 14.5764 || readBack.data.lng !== 121.0851) {
    fail("Coordinates did not persist");
  } else {
    pass("READ returns correct date and lat/lng");
  }

  const update = await writer
    .from("activity_notes")
    .update({ activity: "Updated verify test", remarks: "updated" })
    .eq("id", testId);
  if (update.error) {
    fail(`UPDATE failed: ${update.error.message}`);
  } else {
    pass("UPDATE works on the same row");
  }

  const hide = await writer.from("activity_notes").upsert(
    {
      id: "2026-09-07__usec",
      date: "2026-09-07",
      team: "usec",
      location: "",
      activity: "",
      remarks: "",
      event: "Hidden verify",
      hidden: true,
      lat: null,
      lng: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (hide.error) {
    fail(`HIDE upsert failed: ${hide.error.message}`);
  } else {
    pass("HIDE (hidden=true upsert) works");
  }

  const restore = await writer.from("activity_notes").update({ hidden: false }).eq("id", "2026-09-07__usec");
  if (restore.error) {
    fail(`RESTORE failed: ${restore.error.message}`);
  } else {
    pass("RESTORE (hidden=false) works");
  }

  const del = await writer.from("activity_notes").delete().eq("id", testId);
  if (del.error) {
    fail(`DELETE failed: ${del.error.message}`);
  } else {
    pass("DELETE removes manually created row");
  }

  await writer.from("activity_notes").delete().eq("id", "2026-09-07__usec");

  const anonWrite = await reader.from("activity_notes").insert({
    id: "2026-09-07__anon-should-fail",
    date: "2026-09-07",
    team: "b",
    location: "",
    activity: "",
    remarks: "",
    hidden: false,
    updated_at: new Date().toISOString(),
  });
  if (anonWrite.error) {
    pass(`Anon direct write blocked as expected (${anonWrite.error.message})`);
  } else {
    fail("Anon client was able to insert — RLS/grants are too permissive");
    await writer.from("activity_notes").delete().eq("id", "2026-09-07__anon-should-fail");
  }

  console.log("\n=== Done ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

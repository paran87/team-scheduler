import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __teamSchedulerSupabase?: SupabaseClient;
  __teamSchedulerSupabaseWriter?: SupabaseClient;
};

export function getSupabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return { url, publishableKey, serviceRoleKey };
}

/** True when the API can reach Supabase (publishable or service role + URL). */
export function isSupabaseConfigured() {
  const { url, publishableKey, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && (publishableKey || serviceRoleKey));
}

/** True when the API can write to Supabase. */
export function isSupabaseWriterConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && serviceRoleKey);
}

export function supabaseConfigHint() {
  return (
    "Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), " +
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY), " +
    "and SUPABASE_SERVICE_ROLE_KEY in .env.local and your hosting environment."
  );
}

function makeClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Server reader. Uses the publishable key when present; otherwise the service role key. */
export function getSupabase() {
  const { url, publishableKey, serviceRoleKey } = getSupabaseEnv();
  const key = publishableKey || serviceRoleKey;
  if (!url || !key) {
    throw new Error(`Supabase is not configured. ${supabaseConfigHint()}`);
  }
  if (!globalForSupabase.__teamSchedulerSupabase) {
    globalForSupabase.__teamSchedulerSupabase = makeClient(url, key);
  }
  return globalForSupabase.__teamSchedulerSupabase;
}

/** Server-only writer. Requires SUPABASE_SERVICE_ROLE_KEY so RLS can stay read-only for anon. */
export function getSupabaseWriter() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is required for saving activities. ${supabaseConfigHint()}`,
    );
  }
  if (!globalForSupabase.__teamSchedulerSupabaseWriter) {
    globalForSupabase.__teamSchedulerSupabaseWriter = makeClient(url, serviceRoleKey);
  }
  return globalForSupabase.__teamSchedulerSupabaseWriter;
}

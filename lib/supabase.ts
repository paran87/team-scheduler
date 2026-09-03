import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __teamSchedulerSupabase?: SupabaseClient;
  __teamSchedulerSupabaseWriter?: SupabaseClient;
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return { url, publishableKey, serviceRoleKey };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}

function makeClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabase() {
  const { url, publishableKey } = getSupabaseEnv();
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (!globalForSupabase.__teamSchedulerSupabase) {
    globalForSupabase.__teamSchedulerSupabase = makeClient(url, publishableKey);
  }
  return globalForSupabase.__teamSchedulerSupabase;
}

/** Server-only writer. Requires SUPABASE_SERVICE_ROLE_KEY so RLS can stay read-only for anon. */
export function getSupabaseWriter() {
  const { url, publishableKey, serviceRoleKey } = getSupabaseEnv();
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for saving activities. Add it to .env.local (server-only; never prefix with NEXT_PUBLIC_).",
    );
  }
  if (!globalForSupabase.__teamSchedulerSupabaseWriter) {
    globalForSupabase.__teamSchedulerSupabaseWriter = makeClient(url, serviceRoleKey);
  }
  return globalForSupabase.__teamSchedulerSupabaseWriter;
}

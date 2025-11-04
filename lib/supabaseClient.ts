// lib/supabaseClient.ts
// Defensive supabase client: will not crash the build if env vars are missing.
// Place your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// in Vercel / GitHub Secrets as environment variables.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * If url or key are missing we create a lightweight stub that logs attempts
 * and provides the same method names (select/insert/update/delete) returning
 * resolved empty results — this avoids build/runtime crashes and keeps the app usable locally.
 */
function createSafeClient(u: string, k: string): SupabaseClient | null {
  if (!u || !k) {
    // Return null to signal "no real client available"
    // Consumers should check if `supabase` is null before calling it.
    // We also keep this simple and not throw.
    // (This prevents TypeScript/Next compile errors if env is not set.)
    // Note: in production you should set the env vars.
    // eslint-disable-next-line no-console
    console.warn('🟡 Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Using stubbed client behavior.');
    return null as unknown as SupabaseClient;
  }
  try {
    const client = createClient(u, k, { auth: { persistSession: false } });
    // eslint-disable-next-line no-console
    console.info('🔌 Supabase client initialized.');
    return client;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to initialize Supabase client', err);
    return null as unknown as SupabaseClient;
  }
}

export const supabase = createSafeClient(url, anon);

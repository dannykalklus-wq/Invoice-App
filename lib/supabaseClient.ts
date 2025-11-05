// lib/supabaseClient.ts
// For a Next.js + TypeScript project.
// Place at /lib/supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * This file prefers environment variables:
 *  - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *  - NEXT_PUBLIC_SUPABASE_KEY (or SUPABASE_KEY)
 *
 * It logs only safe prefixes for debugging and will not throw during build
 * if env vars are missing (so builds don't crash with an exception).
 *
 * IMPORTANT: Only use anon/public keys client-side. Never commit a service_role key.
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  process.env.SUPABASE_KEY ||
  '';

let supabase: SupabaseClient | null = null;

try {
  if (!supabaseUrl || !supabaseKey) {
    // Do not throw here to avoid build failure; log instead so you can fix env.
    // eslint-disable-next-line no-console
    console.warn('[supabaseClient] Missing SUPABASE URL or KEY. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY.');
  } else {
    supabase = createClient(supabaseUrl, supabaseKey, {
      // add options here if needed
    });
    // eslint-disable-next-line no-console
    console.log('🧩 Supabase client created. URL host:', supabaseUrl.replace(/^https?:\/\//, ''), ' key-prefix:', supabaseKey.slice(0,12) + (supabaseKey.length>12 ? '...' : ''));
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('❌ Error creating Supabase client', err);
  supabase = null;
}

export { supabase };
export default supabase;

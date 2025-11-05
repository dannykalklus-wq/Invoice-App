// lib/supabaseClient.ts
// Drop this file into /lib in your repo root (create /lib if it doesn't exist).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * IMPORTANT:
 * - Put your anon/public key into Vercel as SUPABASE_KEY (Project Settings -> Environment Variables).
 * - Put your Supabase URL into Vercel as SUPABASE_URL if you prefer; otherwise this file falls back to a constant.
 *
 * This module logs only the first 12 characters of the key for debugging so you can verify the value
 * without printing the full sensitive secret into logs.
 */

// (1) replace this URL with your Supabase URL if you want it hard-coded (optional)
const FALLBACK_SUPABASE_URL = 'https://lxoiqdkghmlafxxeznmc.supabase.co'; // <- update if different

// (2) If you provided an anon key in the repo/CI earlier and want to use it as fallback, set it here.
// ONLY anon/public keys should be used client-side. Do NOT commit service_role keys.
const FALLBACK_SUPABASE_KEY = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY)
  ? undefined
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4b2lxZGtnaG1sYWZ4eGV6bm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDA3NTgsImV4cCI6MjA3NzU3Njc1OH0.xpSpA2BydZDRFkjTqcu5rikSKCec52Rs_LAoHFHvsS0';

// Determine URL and key (prefer explicit env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY || FALLBACK_SUPABASE_KEY || '';

if (!supabaseUrl) {
  // This is critical — the app will still run but Supabase client won't be created
  // to avoid build failures; log for debug.
  // eslint-disable-next-line no-console
  console.warn('[supabaseClient] No SUPABASE_URL defined.');
}

if (!supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabaseClient] No SUPABASE_KEY defined.');
}

// Create a Supabase client if @supabase/supabase-js is available
let supabase: SupabaseClient | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      // fine to include options here if needed
      auth: {
        // don't redirect automatically in SSR contexts
      }
    });
    // eslint-disable-next-line no-console
    console.log('🧩 Supabase client created. URL:', supabaseUrl, ' key-prefix:', supabaseKey?.slice?.(0, 12) ? `${supabaseKey.slice(0,12)}...` : '(none)');
  } else {
    // eslint-disable-next-line no-console
    console.log('🧩 Supabase not initialised — missing URL or key; continuing with local fallback.');
  }
} catch (err: unknown) {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to create Supabase client:', err);
  supabase = null;
}

export { supabase };
export default supabase;

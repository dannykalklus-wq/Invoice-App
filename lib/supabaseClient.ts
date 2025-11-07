// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * If you don't want to use Supabase in some environments, leaving the env empty
 * will simply produce a client that will fail safely when used (you can guard the calls).
 */
export const supabase = createClient(url, key);

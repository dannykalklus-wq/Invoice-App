"use client";
import { createClient } from "@supabase/supabase-js";

// Use public env vars so they’re available on the client (and on Vercel):
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Defensive checks to avoid undefined errors during build/runtime
if (!url) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing. Set it in your Vercel Project → Settings → Environment Variables.");
}
if (!anon) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Set it in your Vercel Project → Settings → Environment Variables.");
}

// Fallbacks to empty string to keep createClient from throwing at import time.
// (Client calls will still fail gracefully if envs are missing.)
export const supabase = createClient(url || "", anon || "");

// Optional diagnostics (safe to keep)
console.log("🧩 Supabase init URL:", url);
console.log("🧩 Supabase key (first 12):", anon ? anon.slice(0, 12) : "(missing)");

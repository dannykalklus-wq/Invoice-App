"use client";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  console.error("Supabase env missing. URL:", url, " ANON:", anon ? "(present)" : "(missing)");
}

export const supabase = createClient(url, anon);

// Optional diagnostics
console.log("🧩 Supabase init URL:", url);
console.log("🧩 Supabase key (first 12):", anon?.slice(0, 12));

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseAvailable =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 0;

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1zWPJY7od_xYHGBiCo0n4E4Tcf574apZ3mE7_Q";

export const supabase: SupabaseClient = isSupabaseAvailable
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(PLACEHOLDER_URL, PLACEHOLDER_ANON_KEY);

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** URL + anon 키 둘 다 있을 때만 실제 Supabase 사용 */
export const isSupabaseAvailable =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 0;

/** 모듈 로드 시 키 누락으로 앱이 죽지 않도록 더미 키 (로그인은 isSupabaseAvailable 로 막음) */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1zWPJY7od_xYHGBiCo0n4E4Tcf574apZ3mE7_Q";

export const supabase: SupabaseClient = isSupabaseAvailable
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(PLACEHOLDER_URL, PLACEHOLDER_ANON_KEY);

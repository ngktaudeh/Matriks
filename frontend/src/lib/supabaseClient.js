import { createClient } from "@supabase/supabase-js";

// Supabase connection — these are PUBLIC (publishable) values, safe to ship
// in the client bundle. The service_role/secret key must NEVER appear here.
const DEFAULT_URL = "https://nyzcjwkpekbsredycvjv.supabase.co";
const DEFAULT_ANON_KEY = "sb_publishable_vq9v6HAyx696M9xJ97QtDg_r7yH3Wqc";

const url = process.env.REACT_APP_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

export const supabase = hasSupabaseConfig
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Whitelist admin emails (comma-separated in env, falls back to default).
// NOTE: actual admin/owner determination now lives in the `admins` table (RLS).
// This value is only used as a fallback label for the owner email.
export const ADMIN_EMAILS = (
  process.env.REACT_APP_ADMIN_EMAILS || "danielsmb385@gmail.com"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

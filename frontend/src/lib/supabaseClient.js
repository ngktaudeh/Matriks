import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

if (!hasSupabaseConfig) {
  console.error("[Matriks] REACT_APP_SUPABASE_URL dan REACT_APP_SUPABASE_ANON_KEY wajib di-set di .env");
}

export const supabase = hasSupabaseConfig
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Guard aman untuk setiap pemakaian `supabase` — kembalikan error ramah
// kalau env belum di-set, alih-alih crash karena memanggil method pada `null`.
export const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "Konfigurasi Supabase belum lengkap. Isi REACT_APP_SUPABASE_URL dan REACT_APP_SUPABASE_ANON_KEY di frontend/.env lalu rebuild."
    );
  }
  return supabase;
};

// Admin emails dari env var saja — JANGAN hardcode di production
export const ADMIN_EMAILS = (
  process.env.REACT_APP_ADMIN_EMAILS || ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

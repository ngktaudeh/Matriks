import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const OWNER_EMAIL = "danielsmb385@gmail.com";

// Sumber kebenaran untuk status admin + akses AI adalah tabel `public.admins`
// (migration 0004/0005). Owner di-hardcode sebagai fallback agar selalu punya akses.
export const useAdmin = (user) => {
  const email = (user?.email || "").toLowerCase();
  const [adminRow, setAdminRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!email || !supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("admins")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        if (mounted) setAdminRow(data || null);
      } catch (err) {
        console.warn("[useAdmin] fetch admins gagal:", err?.message || err);
        if (mounted) setAdminRow(null);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

  const isOwner = email === OWNER_EMAIL;
  const approved = adminRow?.status === "approved";
  const isAdmin = isOwner || approved;
  // Opsi 1: semua admin yang disetujui otomatis dapat akses AI (tanpa flag terpisah).
  const canUseAI = isOwner || approved;

  return { admin: adminRow, loading, isOwner, isAdmin, canUseAI };
};

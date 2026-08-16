import { useState, useEffect } from "react";
import { supabase, ADMIN_EMAILS } from "../lib/supabaseClient";

const OWNER_EMAIL = "danielsmb385@gmail.com";

// Sumber kebenaran untuk status admin + akses AI adalah tabel `public.admins`.
// Owner di-hardcode sebagai fallback agar selalu punya akses.
export const useAdmin = (user) => {
  const email = (user?.email || "").trim().toLowerCase();
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
        // Ambil semua admin lalu cocokkan di client — lebih tahan terhadap
        // masalah .eq()/maybeSingle() + RLS multi-policy.
        const { data, error } = await supabase.from("admins").select("*");
        if (error) throw error;
        const row =
          (data || []).find(
            (a) => (a.email || "").trim().toLowerCase() === email
          ) || null;
        if (mounted) {
          setAdminRow(row);
          console.log(
            "[useAdmin]",
            email,
            "=>",
            row ? `${row.status}/${row.ai_access}` : "NOT FOUND",
            "| total admins:",
            (data || []).length
          );
        }
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
  // Fallback: email yang tercantum di REACT_APP_ADMIN_EMAILS dianggap admin.
  const envAdmin = ADMIN_EMAILS.includes(email);
  const approved = adminRow?.status === "approved" || envAdmin;
  const isAdmin = isOwner || approved;
  // Akses AI = owner, ATAU admin approved (dengan ai_access true, atau envAdmin).
  const canUseAI = isOwner || approved || adminRow?.ai_access === true;

  return { admin: adminRow, loading, isOwner, isAdmin, canUseAI };
};

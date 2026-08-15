import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_CODE = "MATRIKS2026";
const LS_KEY = "matriks-invite-code";

const readLS = () => {
  try {
    return localStorage.getItem(LS_KEY) || DEFAULT_CODE;
  } catch {
    return DEFAULT_CODE;
  }
};

// Kode undangan dibaca dari tabel `app_settings` (public read).
// localStorage hanya sebagai cache/fallback saat Supabase belum ada.
export const useInviteCode = () => {
  const [code, setCode] = useState(readLS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("invite_code")
          .eq("id", 1)
          .maybeSingle();
        if (mounted && data?.invite_code) {
          setCode(data.invite_code);
          try {
            localStorage.setItem(LS_KEY, data.invite_code);
          } catch {}
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateCode = useCallback(async (newCode) => {
    const trimmed = (newCode || "").trim();
    if (!trimmed) return { error: { message: "Kode tidak boleh kosong" } };
    try {
      localStorage.setItem(LS_KEY, trimmed);
    } catch {}
    if (supabase) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ id: 1, invite_code: trimmed });
      if (error) return { error };
    }
    setCode(trimmed);
    return { error: null };
  }, []);

  return { code, loading, updateCode };
};

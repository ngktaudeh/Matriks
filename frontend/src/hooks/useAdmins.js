import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// Daftar admin + kelola akses AI (hanya dipakai oleh owner).
export const useAdmins = (enabled = false) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    if (!enabled || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error) setAdmins(data || []);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const setAiAccess = useCallback(async (id, value) => {
    if (!supabase) return { error: { message: "Supabase belum dikonfigurasi" } };
    const { error } = await supabase
      .from("admins")
      .update({ ai_access: value })
      .eq("id", id);
    if (!error) {
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ai_access: value } : a)));
    }
    return { error };
  }, []);

  const addAdmin = useCallback(async (email, aiAccess = false) => {
    if (!supabase) return { error: { message: "Supabase belum dikonfigurasi" } };
    const clean = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("admins")
      .insert({
        email: clean,
        role: "admin",
        status: "approved",
        ai_access: aiAccess,
      })
      .select()
      .single();
    if (!error) setAdmins((prev) => [...prev, data]);
    return { data, error };
  }, []);

  return { admins, loading, fetchAdmins, setAiAccess, addAdmin };
};

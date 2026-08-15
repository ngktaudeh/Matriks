import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const useCategories = (userId) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (!supabase) {
      setError("Konfigurasi Supabase belum lengkap.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) setError(error.message);
    else setCategories(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (name) => {
    if (!userId || !name.trim()) return { error: "Nama kategori wajib diisi" };
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    const { data, error } = await supabase
      .from("categories")
      .insert([{ user_id: userId, name: name.trim() }])
      .select()
      .single();
    if (!error) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  }, [userId]);

  const updateCategory = useCallback(async (id, name) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    const { data, error } = await supabase
      .from("categories")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();
    if (!error) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  }, []);

  /**
   * Hapus kategori.
   * Jika categoryName + softDeleteItemsByCategory diberikan, semua item
   * di kategori itu dipindah ke Tempat Sampah dulu, baru nama kategori dihapus.
   */
  const deleteCategory = useCallback(async (id, options = {}) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };

    const { categoryName, softDeleteItemsByCategory } = options;

    // 1) Soft-delete semua item di kategori ini → Tempat Sampah
    if (categoryName && typeof softDeleteItemsByCategory === "function") {
      const { error: itemsErr, count } = await softDeleteItemsByCategory(categoryName);
      if (itemsErr) return { error: itemsErr, trashedCount: count || 0 };
    } else if (categoryName && userId) {
      // Fallback langsung di hook jika callback tidak diberikan
      const { error: itemsErr } = await supabase
        .from("items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("category", categoryName)
        .is("deleted_at", null);
      if (itemsErr) return { error: itemsErr };
    }

    // 2) Hapus baris kategori (nama menu). Item sudah di tong sampah.
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
    return { error };
  }, [userId]);

  return { categories, loading, error, fetchCategories, addCategory, updateCategory, deleteCategory };
};

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const useCategories = (userId) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
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
    const { data, error } = await supabase
      .from("categories")
      .insert([{ user_id: userId, name: name.trim() }])
      .select()
      .single();
    if (!error) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  }, [userId]);

  const updateCategory = useCallback(async (id, name) => {
    const { data, error } = await supabase
      .from("categories")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();
    if (!error) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  }, []);

  const deleteCategory = useCallback(async (id) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
    return { error };
  }, []);

  return { categories, loading, error, fetchCategories, addCategory, updateCategory, deleteCategory };
};

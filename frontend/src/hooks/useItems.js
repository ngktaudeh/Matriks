import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const useItems = (userId, view = "active") => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let query = supabase.from("items").select("*");

    if (view === "trash") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setItems(data || []);
    setLoading(false);
  }, [userId, view]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (item) => {
    if (!userId) return { error: "Not authenticated" };
    const { data, error } = await supabase
      .from("items")
      .insert([{ ...item, user_id: userId }])
      .select()
      .single();
    if (!error) setItems((prev) => [data, ...prev]);
    return { data, error };
  }, [userId]);

  const updateItem = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error) setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    return { data, error };
  }, []);

  const toggleFavorite = useCallback(async (id, current) => {
    return updateItem(id, { favorite: !current });
  }, [updateItem]);

  const moveToTrash = useCallback(async (id) => {
    const { data, error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
    return { data, error };
  }, []);

  const restoreItem = useCallback(async (id) => {
    const { data, error } = await supabase
      .from("items")
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
    return { data, error };
  }, []);

  const permanentDelete = useCallback(async (id) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
    return { error };
  }, []);

  const bulkDelete = useCallback(async (ids) => {
    const { error } = await supabase.from("items").delete().in("id", ids);
    if (!error) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    return { error };
  }, []);

  const bulkMoveToTrash = useCallback(async (ids) => {
    const { error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    return { error };
  }, []);

  return {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    updateItem,
    toggleFavorite,
    moveToTrash,
    restoreItem,
    permanentDelete,
    bulkDelete,
    bulkMoveToTrash,
  };
};

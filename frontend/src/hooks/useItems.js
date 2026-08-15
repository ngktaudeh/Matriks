import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { compressImage } from "../utils/image";

export const useItems = (userId, view = "active") => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
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

  // Upload file gambar ke bucket `item-images`, kembalikan URL publik.
  const uploadImage = useCallback(async (file, uid) => {
    if (!supabase) throw new Error("Konfigurasi Supabase belum lengkap.");
    const compressed = await compressImage(file);
    const safeName =
      compressed.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "image";
    const path = `${uid || "user"}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("item-images")
      .upload(path, compressed, {
        cacheControl: "3600",
        upsert: false,
        contentType: compressed.type,
      });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
    return pub?.publicUrl || null;
  }, []);

  const addItem = useCallback(async (item) => {
    if (!userId) return { error: "Not authenticated" };
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };

    // Upload gambar (jika ada) sebelum menyimpan item.
    const { image_file, image_removed, ...rest } = item;
    let image_url = rest.image_url || null;
    try {
      if (image_file) {
        image_url = await uploadImage(image_file, userId);
      }
    } catch (e) {
      return { error: { message: e.message || "Upload gambar gagal" } };
    }

    const { data, error } = await supabase
      .from("items")
      .insert([{ ...rest, image_url, user_id: userId }])
      .select()
      .single();
    if (!error) setItems((prev) => [data, ...prev]);
    return { data, error };
  }, [userId, uploadImage]);

  const updateItem = useCallback(async (id, updates) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };

    // Upload gambar baru (jika ada) sebelum update.
    const { image_file, image_removed, ...rest } = updates;
    let image_url = rest.image_url ?? null;
    try {
      if (image_file) {
        image_url = await uploadImage(image_file, userId);
      } else if (image_removed) {
        image_url = null;
      }
    } catch (e) {
      return { error: { message: e.message || "Upload gambar gagal" } };
    }

    const { data, error } = await supabase
      .from("items")
      .update({ ...rest, image_url })
      .eq("id", id)
      .select()
      .single();
    if (!error) setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    return { data, error };
  }, [userId, uploadImage]);

  const toggleFavorite = useCallback(async (id, current) => {
    return updateItem(id, { favorite: !current });
  }, [updateItem]);

  const moveToTrash = useCallback(async (id) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
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
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
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
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
    return { error };
  }, []);

  const bulkDelete = useCallback(async (ids) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    const { error } = await supabase.from("items").delete().in("id", ids);
    if (!error) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    return { error };
  }, []);

  const bulkMoveToTrash = useCallback(async (ids) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
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

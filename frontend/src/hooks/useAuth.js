import { useState, useEffect, useCallback } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabaseClient";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Tanpa konfigurasi Supabase, jangan coba akses auth (hindari crash).
    if (!hasSupabaseConfig || !supabase) {
      setError(
        "Konfigurasi Supabase belum lengkap. Isi frontend/.env lalu rebuild."
      );
      setLoading(false);
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) setError(error.message);
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    setError(null);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    return { data, error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) return { error: { message: "Konfigurasi Supabase belum lengkap." } };
    setError(null);
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) setError(error.message);
    return { data, error };
  }, []);

  return {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin: false, // TODO: check against admins table
  };
};

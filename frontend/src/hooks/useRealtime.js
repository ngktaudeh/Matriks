import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const useRealtime = (table, onChange, filter = null) => {
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onChange, filter]);
};

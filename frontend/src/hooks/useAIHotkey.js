import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "./useAdmin";
import { useAuth } from "./useAuth";

// Shortcut global Ctrl+B untuk membuka/menutup Matriks.ai (hanya admin yang boleh).
// Jika sedang di /ai, Ctrl+B kembali ke menu utama.
export const useAIHotkey = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canUseAI, loading } = useAdmin(user);

  useEffect(() => {
    if (!canUseAI || loading) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (location.pathname === "/ai") {
          navigate("/");
        } else {
          navigate("/ai");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canUseAI, loading, location.pathname, navigate]);
};

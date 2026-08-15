import { useState, useCallback } from "react";

export const useClipboard = (timeout = 2000) => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
      return true;
    } catch (err) {
      console.error("Copy failed:", err);
      return false;
    }
  }, [timeout]);

  return { copied, copy };
};

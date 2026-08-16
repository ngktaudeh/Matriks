import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocalStorage } from "./useLocalStorage";

const LOCAL_THREADS_KEY = "matriks-chat-threads";
const LOCAL_ACTIVE_KEY = "matriks-chat-active-thread";

// Scope localStorage per user agar chat antar akun di browser yang sama TIDAK bercampur.
const userKey = (base, userId) => (userId ? `${base}:${userId}` : base);

/**
 * Multi-thread chat history.
 * Prefer Supabase (chat_threads / chat_messages) bila tersedia;
 * fallback ke localStorage agar tetap jalan tanpa migrasi.
 */
export const useChat = (userId) => {
  const [localThreads, setLocalThreads] = useLocalStorage(userKey(LOCAL_THREADS_KEY, userId), []);
  const [activeId, setActiveId] = useLocalStorage(userKey(LOCAL_ACTIVE_KEY, userId), null);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useDb, setUseDb] = useState(false);
  const abortRef = useRef(null);
  const dbIdMapRef = useRef({}); // client msgId -> DB row id (untuk update saat streaming selesai)

  // ---- Load threads ----
  const loadThreads = useCallback(async () => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setThreads(localThreads);
      setUseDb(false);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setThreads(data || []);
      setUseDb(true);
      if (data?.length && !activeId) setActiveId(data[0].id);
      if (data?.length && activeId && !data.find((t) => t.id === activeId)) {
        setActiveId(data[0].id);
      }
    } catch (err) {
      // Tabel belum ada / RLS — pakai localStorage
      console.warn("[useChat] loadThreads fallback ke localStorage:", err?.message || err);
      setThreads(localThreads);
      setUseDb(false);
      if (localThreads.length && !activeId) setActiveId(localThreads[0].id);
    } finally {
      setLoading(false);
    }
  }, [userId, localThreads, activeId, setActiveId]);

  useEffect(() => {
    loadThreads();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Load messages for active thread ----
  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    if (useDb && supabase) {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, is_error, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!error) {
        setMessages(
          (data || []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            isError: m.is_error,
            timestamp: m.created_at,
          }))
        );
        return;
      }
    }
    // localStorage fallback
    const t = localThreads.find((x) => x.id === threadId);
    setMessages(t?.messages || []);
  }, [useDb, localThreads]);

  useEffect(() => {
    loadMessages(activeId);
  }, [activeId, loadMessages]);

  // ---- Create thread ----
  const createThread = useCallback(
    async (title = "Percakapan baru") => {
      if (useDb && supabase && userId) {
        const { data, error } = await supabase
          .from("chat_threads")
          .insert([{ user_id: userId, title }])
          .select()
          .single();
        if (!error && data) {
          setThreads((prev) => [data, ...prev]);
          setActiveId(data.id);
          setMessages([]);
          return data.id;
        }
      }
      const id = `local-${Date.now()}`;
      const thread = {
        id,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      };
      const next = [thread, ...localThreads];
      setLocalThreads(next);
      setThreads(next);
      setActiveId(id);
      setMessages([]);
      return id;
    },
    [useDb, userId, localThreads, setLocalThreads, setActiveId]
  );

  // ---- Rename thread ----
  const renameThread = useCallback(
    async (threadId, title) => {
      if (useDb && supabase) {
        await supabase.from("chat_threads").update({ title }).eq("id", threadId);
      }
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title } : t)));
      if (!useDb) {
        setLocalThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, title } : t))
        );
      }
    },
    [useDb, setLocalThreads]
  );

  // ---- Delete thread ----
  const deleteThread = useCallback(
    async (threadId) => {
      if (useDb && supabase) {
        await supabase.from("chat_threads").delete().eq("id", threadId);
      }
      const next = threads.filter((t) => t.id !== threadId);
      setThreads(next);
      if (!useDb) {
        const localNext = localThreads.filter((t) => t.id !== threadId);
        setLocalThreads(localNext);
      }
      if (activeId === threadId) {
        const fallback = next[0]?.id || null;
        setActiveId(fallback);
        if (!fallback) setMessages([]);
      }
    },
    [useDb, threads, localThreads, activeId, setLocalThreads, setActiveId]
  );

  // ---- Append message (local optimistic + persist) ----
  const appendMessage = useCallback(
    async (msg) => {
      const withId = {
        id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: msg.role,
        content: msg.content || "",
        isError: !!msg.isError,
        timestamp: msg.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, withId]);

      let threadId = activeId;
      if (!threadId) {
        threadId = await createThread(
          msg.role === "user" ? msg.content.slice(0, 48) || "Percakapan baru" : "Percakapan baru"
        );
      }

      if (useDb && supabase && userId && threadId) {
        // Selalu insert ke DB (termasuk placeholder assistant kosong) supaya
        // pesan tidak hilang kalau user refresh di tengah streaming.
        const { data: inserted } = await supabase
          .from("chat_messages")
          .insert([
            {
              thread_id: threadId,
              user_id: userId,
              role: withId.role,
              content: withId.content,
              is_error: withId.isError,
            },
          ])
          .select("id")
          .single();
        if (inserted?.id) {
          dbIdMapRef.current[withId.id] = inserted.id;
        }
        // Auto-title dari pesan user pertama
        if (msg.role === "user") {
          const t = threads.find((x) => x.id === threadId);
          if (t && (t.title === "Percakapan baru" || !t.title)) {
            const title = msg.content.slice(0, 48) + (msg.content.length > 48 ? "…" : "");
            await renameThread(threadId, title);
          }
        }
      } else if (threadId) {
        setLocalThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const msgs = [...(t.messages || []), withId];
            const title =
              t.title === "Percakapan baru" && msg.role === "user"
                ? msg.content.slice(0, 48) + (msg.content.length > 48 ? "…" : "")
                : t.title;
            return { ...t, messages: msgs, title, updated_at: new Date().toISOString() };
          })
        );
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const title =
              t.title === "Percakapan baru" && msg.role === "user"
                ? msg.content.slice(0, 48) + (msg.content.length > 48 ? "…" : "")
                : t.title;
            return { ...t, title, updated_at: new Date().toISOString() };
          })
        );
      }
      return withId;
    },
    [activeId, useDb, userId, threads, createThread, renameThread, setLocalThreads]
  );

  // ---- Update last assistant message content (streaming) ----
  const updateMessageContent = useCallback(
    (msgId, content) => {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content } : m)));
      if (!useDb && activeId) {
        setLocalThreads((prev) =>
          prev.map((t) => {
            if (t.id !== activeId) return t;
            return {
              ...t,
              messages: (t.messages || []).map((m) =>
                m.id === msgId ? { ...m, content } : m
              ),
              updated_at: new Date().toISOString(),
            };
          })
        );
      }
    },
    [useDb, activeId, setLocalThreads]
  );

  // ---- Persist final assistant message ke DB setelah stream (UPDATE, bukan insert) ----
  const persistAssistantMessage = useCallback(
    async (msgId, content, isError = false) => {
      if (!useDb || !supabase || !userId || !activeId) return;
      const dbId = dbIdMapRef.current[msgId];
      if (dbId) {
        await supabase
          .from("chat_messages")
          .update({ content, is_error: isError })
          .eq("id", dbId);
        delete dbIdMapRef.current[msgId];
        return;
      }
      // Fallback: kalau belum ada row (mis. useDb baru aktif), insert baru.
      await supabase.from("chat_messages").insert([
        {
          thread_id: activeId,
          user_id: userId,
          role: "assistant",
          content,
          is_error: isError,
        },
      ]);
    },
    [useDb, userId, activeId]
  );

  // ---- Clear all messages in active thread ----
  const clearMessages = useCallback(async () => {
    if (!activeId) return;
    if (useDb && supabase) {
      await supabase.from("chat_messages").delete().eq("thread_id", activeId);
    }
    setMessages([]);
    if (!useDb) {
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, messages: [] } : t))
      );
    }
  }, [activeId, useDb, setLocalThreads]);

  return {
    threads,
    activeId,
    setActiveId,
    messages,
    setMessages,
    loading,
    useDb,
    createThread,
    renameThread,
    deleteThread,
    appendMessage,
    updateMessageContent,
    persistAssistantMessage,
    clearMessages,
    abortRef,
    reload: loadThreads,
  };
};

/**
 * Estimasi jumlah token secara kasar (~1 token per 3.5 char).
 */
export const estimateTokens = (text = "") => {
  if (!text) return 0;
  return Math.ceil(String(text).length / 3.5);
};

/**
 * Sanitasi ringan konten vault agar tidak bisa memanipulasi system prompt
 * (mitigasi prompt injection). Konten item diperlakukan sebagai data, bukan instruksi.
 */
const sanitizeVaultText = (text = "") => {
  let t = String(text)
    .replace(/\s+/g, " ")
    // Batasi instruksi sistem yang jelas-jelas mencoba "menimpa" peran AI.
    .replace(/ignore (all )?(previous|prior|above) instructions/gi, "[instruksi diabaikan]")
    .replace(/forget (everything|your (rules|instructions|prompt))/gi, "[instruksi diabaikan]")
    .replace(/you are now /gi, "")
    .replace(/system\s*:/gi, "");
  return t;
};

/**
 * Bangun ringkasan konteks vault untuk system prompt AI.
 * Dibatasi oleh BUDGET TOKEN (bukan sekadar jumlah item) agar tidak meledak.
 */
export const buildVaultContext = (items = [], categories = [], tokenBudget = 20000) => {
  if (!items.length) {
    return "Vault user saat ini kosong (belum ada item).";
  }
  const byCat = {};
  items.forEach((it) => {
    const c = it.category || "Uncategorized";
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(it);
  });

  const header = `Total item: ${items.length}. Kategori: ${
    categories.map((c) => c.name || c).join(", ") || Object.keys(byCat).join(", ")
  }.`;
  const lines = [header, "Daftar item (ringkas):"];

  let tokens = estimateTokens(header);
  let omitted = 0;

  for (const [cat, list] of Object.entries(byCat)) {
    const catLine = `\n## ${cat} (${list.length})`;
    if (tokens + estimateTokens(catLine) > tokenBudget) {
      omitted += list.length;
      continue;
    }
    lines.push(catLine);
    tokens += estimateTokens(catLine);

    for (const it of list) {
      const tags = it.tags?.length ? ` [${it.tags.join(", ")}]` : "";
      const fav = it.favorite ? " ★" : "";
      const contentPreview = sanitizeVaultText(it.content || "").slice(0, 180);
      const line = `- ${it.title}${fav}${tags}: ${contentPreview}`;
      const lineTokens = estimateTokens(line);
      if (tokens + lineTokens > tokenBudget) {
        omitted += list.length;
        break;
      }
      lines.push(line);
      tokens += lineTokens;
    }
    if (tokens >= tokenBudget) break;
  }

  if (omitted > 0) {
    lines.push(`… dan ${omitted} item lainnya (dipotong agar sesuai batas token).`);
  }
  return lines.join("\n");
};

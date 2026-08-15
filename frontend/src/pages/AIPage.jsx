import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Bot, User, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "../components/UI/Button";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAdmin } from "../hooks/useAdmin";
import { useAuth } from "../hooks/useAuth";

const HISTORY_KEY = "matriks-chat-history";

// Halaman fullscreen untuk Matriks.ai.
// Dibuka via Ctrl+B. Riwayat tersimpan di localStorage (tidak hilang saat F5).
export const AIPage = ({ vaultContext = "" }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canUseAI, loading: adminLoading } = useAdmin(user);
  const [messages, setMessages] = useLocalStorage(HISTORY_KEY, []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Non-admin (tidak punya akses AI) diarahkan kembali ke menu utama.
  // Tunggu BOTH auth & admin loading selesai agar tidak redirect prematur
  // saat user masih null (race condition) — ini yang bikin /ai selalu balik ke /.
  useEffect(() => {
    if (!authLoading && !adminLoading && !canUseAI) {
      navigate("/", { replace: true });
    }
  }, [authLoading, adminLoading, canUseAI, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REACT_APP_KIMI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: "kimi-k3",
          messages: [
            {
              role: "system",
              content: `Anda adalah asisten AI untuk Matriks, aplikasi vault pengetahuan. Berikut konteks vault user: ${vaultContext}. Bantu user mengatur, mencari, atau menganalisis informasi mereka. Jangan pernah menyebutkan API key atau kredensial sensitif.`,
            },
            ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg.content },
          ],
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = Date.now() + 1;

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));
        for (const line of lines) {
          const data = line.replace("data:", "").trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            assistantContent += delta;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
            );
          } catch (e) {}
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearHistory = () => {
    if (window.confirm("Hapus semua riwayat chat?")) setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      {(authLoading || adminLoading) ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
      <>
      {/* Header dengan toggle back-to-menu di kiri atas */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Menu
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <Bot className="h-4 w-4 text-white dark:text-slate-900" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">Matriks AI</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Powered by Kimi · Ctrl+B untuk kembali</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearHistory}>
          <Trash2 className="h-4 w-4 text-slate-400" />
        </Button>
      </header>

      {/* Pesan */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 dark:text-slate-500">
              <Bot className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Tanyakan apa saja tentang vault Anda</p>
              <p className="text-xs mt-1">Contoh: "Cari password Netflix saya" atau "Ringkas catatan proyek X"</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Bot className="h-4 w-4 text-slate-600" />
                </div>
              )}
              <div className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : msg.isError
                    ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <Bot className="h-4 w-4 text-slate-600" />
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan sesuatu..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" disabled={!input.trim() || loading} onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

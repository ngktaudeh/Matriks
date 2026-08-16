import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Bot,
  Loader2,
  Trash2,
  PanelLeft,
  Square,
} from "lucide-react";
import { Button } from "../components/UI/Button";
import { ChatMessage } from "../components/AI/ChatMessage";
import { ChatSidebar } from "../components/AI/ChatSidebar";
import { SuggestedPrompts } from "../components/AI/SuggestedPrompts";
import { useAuth } from "../hooks/useAuth";
import { useAdmin } from "../hooks/useAdmin";
import { useItems } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useChat, buildVaultContext } from "../hooks/useChat";

const SYSTEM_PROMPT = `Kamu adalah Matriks AI — asisten pribadi yang sangat cerdas untuk Knowledge Vault user.

Gaya bicara:
- Santai, jelas, to the point, seperti teman yang pintar
- Jangan formal berlebihan. Hindari kata "mohon", "terima kasih", "silakan" di setiap jawaban
- Langsung jawab. Jangan basa-basi panjang
- Kalau data ada di vault, sebutkan jelas (judul + isi singkat)
- Kalau data tidak ada, bilang jujur + tawarkan bantuan lain

Kemampuan utama:
1. Cari item di vault dengan cepat (password, catatan, link, dll)
2. Ringkas & analisis isi vault
3. Bantu organisasi, tagging, dan template
4. Deteksi password lemah / data yang perlu update

Aturan keras:
- JANGAN mengarang item yang tidak ada di vault
- JANGAN pernah tampilkan atau minta API key
- Prioritaskan data dari konteks vault di bawah
- Jawab pakai bahasa user (biasanya Indonesia)
- Format jawaban rapi (list, bold, code) biar mudah dibaca

Konteks vault user saat ini:
`;

export const AIPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canUseAI, loading: adminLoading } = useAdmin(user);
  const { items } = useItems(user?.id);
  const { categories } = useCategories(user?.id);

  const {
    threads,
    activeId,
    setActiveId,
    messages,
    loading: chatLoading,
    createThread,
    renameThread,
    deleteThread,
    appendMessage,
    updateMessageContent,
    persistAssistantMessage,
    clearMessages,
  } = useChat(user?.id);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const vaultContext = useMemo(
    () => buildVaultContext(items, categories),
    [items, categories]
  );

  useEffect(() => {
    if (!authLoading && !adminLoading && !canUseAI) {
      navigate("/", { replace: true });
    }
  }, [authLoading, adminLoading, canUseAI, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  }, []);

  const callAI = useCallback(
    async (historyMessages, userContent) => {
      const apiKey = process.env.REACT_APP_KIMI_API_KEY || "";
      const proxyUrl = process.env.REACT_APP_AI_PROXY_URL || "";

      const payload = {
        model: process.env.REACT_APP_AI_MODEL || "kimi-k3",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT + vaultContext,
          },
          ...historyMessages.slice(-16).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
          { role: "user", content: userContent },
        ],
        stream: true,
      };

      const controller = new AbortController();
      abortRef.current = controller;

      let response;
      if (proxyUrl) {
        response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } else {
        if (!apiKey) {
          throw new Error(
            "API key belum dikonfigurasi. Set REACT_APP_KIMI_API_KEY atau REACT_APP_AI_PROXY_URL di .env"
          );
        }
        response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `AI request failed (${response.status})${errText ? `: ${errText.slice(0, 200)}` : ""}`
        );
      }

      return response;
    },
    [vaultContext]
  );

  const streamResponse = useCallback(
    async (response, assistantId) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta =
              parsed.choices?.[0]?.delta?.content ||
              parsed.choices?.[0]?.text ||
              "";
            if (delta) {
              assistantContent += delta;
              updateMessageContent(assistantId, assistantContent);
            }
          } catch {
            // ignore partial JSON
          }
        }
      }
      return assistantContent;
    },
    [updateMessageContent]
  );

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    await appendMessage(userMsg);

    const assistantId = `a-${Date.now()}`;
    await appendMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    });

    try {
      const historyForApi = [
        ...messages.filter((m) => m.content),
        userMsg,
      ];
      const response = await callAI(historyForApi, text);
      const finalContent = await streamResponse(response, assistantId);

      if (!finalContent) {
        updateMessageContent(
          assistantId,
          "Maaf, tidak ada respons dari model. Coba lagi."
        );
      } else {
        await persistAssistantMessage(assistantId, finalContent, false);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        const errMsg =
          err.message ||
          "Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.";
        updateMessageContent(assistantId, errMsg);
        await persistAssistantMessage(assistantId, errMsg, true);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRegenerate = async () => {
    if (loading || messages.length < 1) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const lastUser = messages[lastUserIdx];
    await handleSend(lastUser.content);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && !messages[i].isError) {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const isBooting = authLoading || adminLoading || chatLoading;

  return (
    <div className="flex h-screen flex-col bg-transparent">
      {isBooting ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className={`${sidebarOpen ? "block" : "hidden"} md:block`}>
            <ChatSidebar
              threads={threads}
              activeId={activeId}
              onSelect={setActiveId}
              onCreate={() => createThread()}
              onRename={renameThread}
              onDelete={deleteThread}
              onClose={() => setSidebarOpen(false)}
              open={sidebarOpen}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/70 px-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                  onClick={() => setSidebarOpen((v) => !v)}
                  title="Riwayat chat"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Vault
                </Button>
                <div className="ml-1 hidden items-center gap-2 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/25">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                      Matriks AI
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Vault-aware · Ctrl+B · {items.length} item di konteks
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  title="Chat baru"
                  onClick={() => createThread()}
                >
                  <Bot className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  title="Hapus pesan di thread ini"
                  onClick={() => {
                    if (window.confirm("Hapus semua pesan di percakapan ini?")) {
                      clearMessages();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-4">
              <div className="mx-auto w-full max-w-3xl space-y-5">
                {messages.length === 0 && !loading && (
                  <SuggestedPrompts onSelect={(t) => handleSend(t)} />
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    msg={msg}
                    onCopy={handleCopy}
                    onRegenerate={handleRegenerate}
                    isLastAssistant={msg.id === lastAssistantId && !loading}
                  />
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/25">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/80">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                      <span className="text-xs text-slate-500">Menulis…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 p-3 dark:border-slate-800/80 sm:p-4">
              <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/80">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanyakan sesuatu tentang vault kamu…"
                  rows={1}
                  className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
                {loading ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 shrink-0"
                    onClick={stopGeneration}
                    title="Stop"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:brightness-110"
                    disabled={!input.trim()}
                    onClick={() => handleSend()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
                Matriks AI memakai konteks vault kamu. Jangan bagikan data sangat sensitif jika tidak perlu.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

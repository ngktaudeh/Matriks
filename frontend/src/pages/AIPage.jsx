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
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { Button } from "../components/UI/Button";
import { ChatMessage } from "../components/AI/ChatMessage";
import { ChatSidebar } from "../components/AI/ChatSidebar";
import { SuggestedPrompts } from "../components/AI/SuggestedPrompts";
import { useAuth } from "../hooks/useAuth";
import { useAdmin } from "../hooks/useAdmin";
import { useItems } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useChat, buildVaultContext, estimateTokens } from "../hooks/useChat";

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
- Kalau pertanyaan user menyangkut harga, berita, tanggal/versi terbaru, status orang/perusahaan saat ini, atau hal apa pun yang bisa berubah dari waktu ke waktu — WAJIB panggil tool $web_search dulu sebelum menjawab. Jangan jawab dari ingatan untuk hal yang time-sensitive. Kalau memakai hasil pencarian, sebutkan sumbernya secara singkat di jawaban.

Konteks vault user saat ini:
`;

export const AIPage = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
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
  const [attachments, setAttachments] = useState([]); // { id, name, type, dataUrl, isImage }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  const vaultContext = useMemo(
    () => buildVaultContext(items, categories),
    [items, categories]
  );

  useEffect(() => {
    // Jangan redirect selama sesi/admin masih dimuat. `!user` menandakan sesi
    // belum siap (mencegah redirect prematur → "cuma refresh terus").
    if (!user || authLoading || adminLoading) return;
    if (!canUseAI) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, adminLoading, canUseAI, navigate]);

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

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const next = [];
    for (const file of files.slice(0, 4)) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      next.push({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        type: file.type,
        dataUrl,
        isImage: file.type.startsWith("image/"),
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 6));
  };

  const removeAttachment = (id) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const callAI = useCallback(
    async (historyMessages, userContent) => {
      const apiKey = process.env.REACT_APP_KIMI_API_KEY || "";
      // Proxy (Edge Function) hanya dipakai bila REACT_APP_AI_PROXY_URL di-set eksplisit.
      // Jangan dipaksa default — biar AI tetap jalan meski proxy belum dikonfigurasi.
      const proxyUrl = process.env.REACT_APP_AI_PROXY_URL || "";

      const images = attachments.filter((a) => a.isImage);
      const texts = attachments.filter((a) => !a.isImage);

      let textPayload = userContent;
      if (texts.length) {
        textPayload +=
          "\n\n[File terlampir]\n" +
          texts.map((t) => `- ${t.name}`).join("\n");
      }

      const userContentParts = [];
      if (images.length) {
        userContentParts.push({ type: "text", text: textPayload });
        images.forEach((img) => {
          userContentParts.push({
            type: "image_url",
            image_url: { url: img.dataUrl },
          });
        });
      }

      // Truncate history berdasarkan estimasi token (bukan slice -16 naif).
      const HISTORY_BUDGET = 24000;
      const trimmed = [];
      let histTokens = 0;
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const m = historyMessages[i];
        const t = estimateTokens(typeof m.content === "string" ? m.content : "");
        if (histTokens + t > HISTORY_BUDGET) break;
        trimmed.unshift({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        });
        histTokens += t;
      }

      const payload = {
        model: process.env.REACT_APP_AI_MODEL || "kimi-k3",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT + vaultContext,
          },
          ...trimmed,
          {
            role: "user",
            content: images.length ? userContentParts : textPayload,
          },
        ],
        stream: true,
      };

      const controller = new AbortController();
      abortRef.current = controller;

      let response;
      if (proxyUrl) {
        const accessToken = session?.access_token || "";
        const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
        response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
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
    [vaultContext, attachments, session]
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
    const hasAttach = attachments.length > 0;
    if ((!text && !hasAttach) || loading) return;

    setInput("");
    setLoading(true);

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text || (hasAttach ? `(${attachments.length} file terlampir)` : text),
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
      setAttachments([]);
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
    } catch (err) {
      console.warn("[AIPage] copy gagal:", err?.message || err);
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
          <Loader2 className="h-6 w-6 animate-spin text-[#ff2a5f]" />
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
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[rgba(10,10,14,0.8)] px-3 backdrop-blur-md">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-md shadow-[#ff2a5f]/30">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-white">
                      Line Togel AI
                    </h3>
                    <p className="text-[10px] text-white/50">
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
                  <Trash2 className="h-4 w-4 text-white/50" />
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-md shadow-[#ff2a5f]/30">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-[#ff2a5f]" />
                      <span className="text-xs text-white/50">Menulis…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
              {attachments.length > 0 && (
                <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="group relative flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white/80"
                    >
                      {a.isImage ? (
                        <img src={a.dataUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#ff7a9e]" />
                      )}
                      <span className="max-w-[100px] truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className="rounded-full p-0.5 hover:bg-white/15"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 shadow-lg backdrop-blur-xl input-neon">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.md,.json,.csv"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <button
                  type="button"
                  onClick={handlePickFiles}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                  title="Upload gambar / file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya vault, atau tempel + upload gambar…"
                  rows={1}
                  className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                {loading ? (
                  <Button size="icon" variant="ghost" className="h-10 w-10" onClick={stopGeneration}>
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-10 w-10"
                    disabled={!input.trim() && attachments.length === 0}
                    onClick={() => handleSend()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Copy, Highlighter, Palette, MousePointer2, Check } from "lucide-react";
import { Button } from "../UI/Button";

const COLORS = [
  { name: "Merah Neon", bg: "#ff2a5f", text: "#ffffff" },
  { name: "Emas", bg: "#ffd700", text: "#000000" },
  { name: "Cyan", bg: "#00f0ff", text: "#001a1d" },
  { name: "Hijau", bg: "#00ff88", text: "#00150c" },
  { name: "Kuning", bg: "#ffaa00", text: "#000000" },
  { name: "Ungu", bg: "#a855f7", text: "#ffffff" },
];

const HIGHLIGHT_PRESETS = [
  "Aman dan terpercaya ✓",
  "Promo berlaku hari ini",
  "Deposit 1 menit proses",
  "Withdraw tanpa potongan",
  "Minimal bet Rp 1.000",
];

export const HighlighterSuite = ({ onClose }) => {
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef(null);

  const applyColor = useCallback((c) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const selected = text.slice(start, end);
    const wrapped = `<mark style="background:${c.bg};color:${c.text};padding:2px 6px;border-radius:6px;">${selected}</mark>`;
    const next = text.slice(0, start) + wrapped + text.slice(end);
    setText(next);
  }, [text]);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Berhasil disalin");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,42,95,0.4)] bg-[rgba(255,42,95,0.15)] text-[#ff2a5f]">
          <Highlighter className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold text-white">Highlighter Suite</h1>
          <p className="text-xs text-white/50">Bungkus teks livechat jadi highlight HTML siap tempel</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="float-card glass rounded-2xl p-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis atau tempel teks di sini…"
            className="h-64 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-white/30 focus:border-[#ff2a5f] focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={copyResult}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Tersalin" : "Salin HTML"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setText("")}>
              Bersihkan
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="float-card glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Palette className="h-4 w-4 text-[#ffd700]" /> Warna Highlight
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.bg}
                  onClick={() => setColor(c)}
                  className={`flex h-10 items-center justify-center rounded-xl text-[10px] font-bold transition-all ${
                    color.bg === c.bg ? "ring-2 ring-white scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ background: c.bg, color: c.text }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={applyColor}>
              <MousePointer2 className="h-4 w-4" /> Terapkan ke Teks Dipilih
            </Button>
          </div>

          <div className="float-card glass rounded-2xl p-4">
            <div className="mb-2 text-sm font-bold text-white">Preset Cepat</div>
            <div className="space-y-2">
              {HIGHLIGHT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setText((t) => (t ? t + "\n" + p : p))}
                  className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/80 transition hover:border-[#ff2a5f] hover:bg-[rgba(255,42,95,0.1)]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

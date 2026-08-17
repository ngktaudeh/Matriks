import React from "react";
import { Search, List, Sparkles, Key, FileText, Tag } from "lucide-react";

const PROMPTS = [
  {
    icon: Search,
    label: "Cari item",
    text: "Cari item di vault saya yang berkaitan dengan password atau login",
    color: "from-[#ff2a5f] to-[#ff003c]",
  },
  {
    icon: List,
    label: "Ringkas vault",
    text: "Ringkas isi vault saya per kategori. Sebutkan berapa item di tiap kategori.",
    color: "from-[#00f0ff] to-[#0284c7]",
  },
  {
    icon: Key,
    label: "Password lemah?",
    text: "Bantu saya cek apakah ada password yang terlihat lemah atau perlu diganti di vault.",
    color: "from-[#ffd700] to-[#ff8800]",
  },
  {
    icon: FileText,
    label: "Buat catatan",
    text: "Bantu saya menyusun template catatan proyek yang rapi untuk disimpan di vault.",
    color: "from-[#00ff88] to-[#059669]",
  },
  {
    icon: Tag,
    label: "Saran tag",
    text: "Berdasarkan isi vault saya, sarankan skema tag yang konsisten.",
    color: "from-[#ff2a5f] to-[#800020]",
  },
  {
    icon: Sparkles,
    label: "Ide organisasi",
    text: "Bagaimana cara terbaik mengorganisir vault pengetahuan saya agar mudah dicari?",
    color: "from-[#a855f7] to-[#7c3aed]",
  },
];

export const SuggestedPrompts = ({ onSelect }) => (
  <div className="mx-auto w-full max-w-2xl px-2">
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-lg shadow-[#ff2a5f]/30">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="font-display text-xl font-bold tracking-tight text-white">
        Line Togel AI
      </h2>
      <p className="mt-1.5 text-sm text-white/50">
        Asisten yang paham isi vault kamu. Langsung tanya aja.
      </p>
    </div>

    <div className="grid gap-2.5 sm:grid-cols-2">
      {PROMPTS.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelect?.(p.text)}
          className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#ff2a5f]/50 hover:shadow-[0_0_20px_rgba(255,42,95,0.2)]"
        >
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} shadow-sm`}
          >
            <p.icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {p.label}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">
              {p.text}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

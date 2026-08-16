import React from "react";
import { Search, List, Sparkles, Key, FileText, Tag } from "lucide-react";

const PROMPTS = [
  {
    icon: Search,
    label: "Cari item",
    text: "Cari item di vault saya yang berkaitan dengan password atau login",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: List,
    label: "Ringkas vault",
    text: "Ringkas isi vault saya per kategori. Sebutkan berapa item di tiap kategori.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Key,
    label: "Password lemah?",
    text: "Bantu saya cek apakah ada password yang terlihat lemah atau perlu diganti di vault.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FileText,
    label: "Buat catatan",
    text: "Bantu saya menyusun template catatan proyek yang rapi untuk disimpan di vault.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Tag,
    label: "Saran tag",
    text: "Berdasarkan isi vault saya, sarankan skema tag yang konsisten.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Sparkles,
    label: "Ide organisasi",
    text: "Bagaimana cara terbaik mengorganisir vault pengetahuan saya agar mudah dicari?",
    color: "from-indigo-500 to-blue-500",
  },
];

export const SuggestedPrompts = ({ onSelect }) => (
  <div className="mx-auto w-full max-w-2xl px-2">
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Matriks AI
      </h2>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Asisten yang paham isi vault kamu. Langsung tanya aja.
      </p>
    </div>

    <div className="grid gap-2.5 sm:grid-cols-2">
      {PROMPTS.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelect?.(p.text)}
          className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-slate-600"
        >
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} shadow-sm`}
          >
            <p.icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {p.label}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {p.text}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

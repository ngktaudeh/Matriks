import React from "react";
import { Search, List, Sparkles, Key, FileText, Tag } from "lucide-react";

const PROMPTS = [
  {
    icon: Search,
    label: "Cari item",
    text: "Cari item di vault saya yang berkaitan dengan password atau login",
  },
  {
    icon: List,
    label: "Ringkas vault",
    text: "Ringkas isi vault saya per kategori. Sebutkan berapa item di tiap kategori.",
  },
  {
    icon: Key,
    label: "Password lemah?",
    text: "Bantu saya cek apakah ada password yang terlihat lemah atau perlu diganti di vault.",
  },
  {
    icon: FileText,
    label: "Buat catatan",
    text: "Bantu saya menyusun template catatan proyek yang rapi untuk disimpan di vault.",
  },
  {
    icon: Tag,
    label: "Saran tag",
    text: "Berdasarkan isi vault saya, sarankan skema tag yang konsisten.",
  },
  {
    icon: Sparkles,
    label: "Ide organisasi",
    text: "Bagaimana cara terbaik mengorganisir vault pengetahuan saya agar mudah dicari?",
  },
];

export const SuggestedPrompts = ({ onSelect }) => (
  <div className="mx-auto w-full max-w-2xl px-2">
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Sparkles className="h-7 w-7 text-slate-500 dark:text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Matriks AI
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Asisten yang memahami isi vault Anda. Tanyakan apa saja.
      </p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {PROMPTS.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelect?.(p.text)}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <p.icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {p.label}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {p.text}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

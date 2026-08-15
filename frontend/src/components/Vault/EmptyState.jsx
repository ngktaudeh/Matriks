import React from "react";
import { Search, FileX, Star, Trash2, Plus, KeyRound, FileText, Code, Link as LinkIcon } from "lucide-react";
import { Button } from "../UI/Button";
import { ITEM_TEMPLATES } from "../../lib/constants";

const illustrations = {
  empty: (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="h-24 w-24 rounded-2xl bg-slate-100 flex items-center justify-center dark:bg-slate-800">
          <FileX className="h-10 w-10 text-slate-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center dark:bg-slate-700">
          <Plus className="h-4 w-4 text-slate-500" />
        </div>
      </div>
    </div>
  ),
  search: (
    <div className="h-24 w-24 rounded-2xl bg-slate-100 flex items-center justify-center dark:bg-slate-800">
      <Search className="h-10 w-10 text-slate-400" />
    </div>
  ),
  favorites: (
    <div className="h-24 w-24 rounded-2xl bg-amber-50 flex items-center justify-center dark:bg-amber-900/20">
      <Star className="h-10 w-10 text-amber-400" />
    </div>
  ),
  trash: (
    <div className="h-24 w-24 rounded-2xl bg-red-50 flex items-center justify-center dark:bg-red-900/20">
      <Trash2 className="h-10 w-10 text-red-400" />
    </div>
  ),
};

export const EmptyState = ({ type = "empty", query = "", onCreate, onClearSearch }) => {
  const configs = {
    empty: {
      title: "Vault Anda Kosong",
      description: "Mulai dengan membuat item pertama Anda. Pilih template di bawah:",
      illustration: illustrations.empty,
      actions: true,
    },
    search: {
      title: "Tidak Ada Hasil",
      description: `Pencarian "${query}" tidak menemukan apa pun.`,
      illustration: illustrations.search,
      actions: false,
    },
    favorites: {
      title: "Belum Ada Favorit",
      description: "Bintangi item untuk melihatnya di sini.",
      illustration: illustrations.favorites,
      actions: false,
    },
    trash: {
      title: "Tempat Sampah Kosong",
      description: "Item yang dihapus akan muncul di sini selama 30 hari.",
      illustration: illustrations.trash,
      actions: false,
    },
  };

  const config = configs[type];
  const templateIcons = { KeyRound, FileText, Code, Link: LinkIcon };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {config.illustration}
      <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">{config.title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{config.description}</p>

      {type === "search" && onClearSearch && (
        <Button variant="secondary" className="mt-6" onClick={onClearSearch}>
          Bersihkan Pencarian
        </Button>
      )}

      {config.actions && onCreate && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(ITEM_TEMPLATES).map(([key, template]) => {
            const Icon = templateIcons[template.icon] || FileText;
            return (
              <button
                key={key}
                onClick={() => onCreate(key)}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 transition-all hover:border-slate-400 hover:shadow-sm dark:border-slate-700 dark:hover:border-slate-500"
              >
                <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{template.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

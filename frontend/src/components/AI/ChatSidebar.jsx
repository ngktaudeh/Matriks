import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "../UI/Button";

export const ChatSidebar = ({
  threads = [],
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onClose,
  open,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditTitle(t.title || "");
  };

  const commitEdit = () => {
    if (editingId && editTitle.trim()) {
      onRename?.(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!open) return null;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <Button
          size="sm"
          className="flex-1 justify-start gap-2"
          onClick={() => onCreate?.()}
        >
          <Plus className="h-4 w-4" />
          Chat baru
        </Button>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 lg:hidden"
          title="Tutup sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {threads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            Belum ada percakapan
          </p>
        )}
        <div className="space-y-0.5">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                activeId === t.id
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => onSelect?.(t.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                ) : (
                  <span className="truncate">{t.title || "Tanpa judul"}</span>
                )}
              </button>

              {editingId === t.id ? (
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={commitEdit}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(t);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                    title="Ganti nama"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Hapus percakapan ini?")) onDelete?.(t.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="Hapus"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

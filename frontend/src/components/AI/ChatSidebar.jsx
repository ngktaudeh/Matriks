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
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-[rgba(10,10,14,0.9)]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 lg:hidden"
          title="Tutup sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {threads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-white/40">
            Belum ada percakapan
          </p>
        )}
        <div className="space-y-0.5">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                activeId === t.id
                  ? "bg-[rgba(255,42,95,0.18)] text-white border border-[rgba(255,42,95,0.35)]"
                  : "text-white/60 hover:bg-white/10"
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
                    className="w-full rounded border border-white/20 bg-black/40 px-1.5 py-0.5 text-xs text-white"
                  />
                ) : (
                  <span className="truncate">{t.title || "Tanpa judul"}</span>
                )}
              </button>

              {editingId === t.id ? (
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={commitEdit}
                    className="rounded p-1 text-[#00ff88] hover:bg-[#00ff88]/10"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-white/40 hover:bg-white/10"
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
                    className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                    title="Ganti nama"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Hapus percakapan ini?")) onDelete?.(t.id);
                    }}
                    className="rounded p-1 text-white/40 hover:bg-[#ff2a5f]/15 hover:text-[#ff2a5f]"
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

import React, { useState } from "react";
import {
  Star, Copy, Check, Trash2, Edit3, Move, KeyRound, FileText, Code, Link as LinkIcon,
  Clock, Heart
} from "lucide-react";
import { Button } from "../UI/Button";
import { Tooltip } from "../UI/Tooltip";
import { formatRelative, truncate } from "../../utils/formatters";

const typeIcons = {
  password: KeyRound,
  apikey: Code,
  note: FileText,
  link: LinkIcon,
};

const typeColors = {
  password: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  apikey: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  note: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  link: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
};

export const ItemCard = ({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
  isSelected,
  onSelect,
  selectionMode,
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const [showActions, setShowActions] = useState(false);

  const detectType = (item) => {
    if (item.category?.toLowerCase().includes("password")) return "password";
    if (item.category?.toLowerCase().includes("api")) return "apikey";
    if (item.category?.toLowerCase().includes("link")) return "link";
    return "note";
  };

  const type = detectType(item);
  const Icon = typeIcons[type] || FileText;
  const colorClass = typeColors[type] || typeColors.note;

  const handleCopy = async (text, field) => {
    const ok = await onCopy(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div
      className={`
        group relative rounded-xl border transition-all duration-200
        ${isSelected
          ? "border-slate-900 bg-slate-50 shadow-sm dark:border-white dark:bg-slate-800"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
        }
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {selectionMode && (
        <div className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h4>
              {item.favorite && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
              {truncate(item.content, 120)}
            </p>

            {item.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelative(item.updated_at || item.created_at)}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{item.category}</span>
            </div>
          </div>
        </div>

        <div className={`
          mt-3 flex items-center justify-end gap-1 transition-opacity duration-200
          ${showActions || selectionMode ? "opacity-100" : "opacity-0 sm:opacity-0 sm:group-hover:opacity-100"}
        `}>
          <Tooltip text={item.favorite ? "Hapus dari favorit" : "Tambah ke favorit"}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(item.id, item.favorite)}
            >
              <Heart className={`h-4 w-4 ${item.favorite ? "fill-amber-400 text-amber-400" : ""}`} />
            </Button>
          </Tooltip>

          <Tooltip text="Salin konten">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleCopy(item.content, "content")}
            >
              {copiedField === "content" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </Tooltip>

          <Tooltip text="Edit">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
              <Edit3 className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip text="Hapus">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

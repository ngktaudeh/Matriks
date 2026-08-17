import React, { useState, useRef, useEffect } from "react";
import {
  Star, Copy, Check, Trash2, Edit3, Heart, MoreVertical,
  Clock, ExternalLink, Download
} from "lucide-react";
import { Tooltip } from "../UI/Tooltip";
import { formatRelative, truncate } from "../../utils/formatters";

const extractImages = (content) => {
  if (!content) return [];
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  const urlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi;
  const mdMatches = [...content.matchAll(imgRegex)].map((m) => m[1]);
  const urlMatches = [...content.matchAll(urlRegex)].map((m) => m[0]);
  return [...new Set([...mdMatches, ...urlMatches])];
};

// Gabungkan: gambar yang di-upload (item.image_url) + gambar yang tertanam di konten.
const getAllImages = (item) => {
  const embedded = extractImages(item.content);
  const all = item.image_url ? [item.image_url, ...embedded] : embedded;
  return [...new Set(all)];
};

const detectType = (item) => {
  const c = item.category?.toLowerCase() || "";
  const content = item.content || "";
  if (c.includes("password")) return "password";
  if (c.includes("api")) return "apikey";
  if (c.includes("link")) return "link";
  if (getAllImages(item).length > 0) return "image";
  return "note";
};

const typeConfig = {
  password: { label: "PWD", color: "text-[#ffd700] bg-[#ffd700]/10 border-[#ffd700]/30" },
  apikey: { label: "API", color: "text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/30" },
  note: { label: "TXT", color: "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30" },
  link: { label: "URL", color: "text-[#ff2a5f] bg-[#ff2a5f]/10 border-[#ff2a5f]/30" },
  image: { label: "IMG", color: "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30" },
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
  onImageClick,
  onOpen,
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  const type = detectType(item);
  const config = typeConfig[type] || typeConfig.note;
  const images = getAllImages(item);
  const hasImages = images.length > 0 && !imgError;

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCopy = async (text, field) => {
    const ok = await onCopy(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCopyImage = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopiedField("img");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback: copy URL
      await navigator.clipboard.writeText(url);
      setCopiedField("imgurl");
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const textPreview = (item.content || "")
    .replace(/!\[.*?\]\((.*?)\)/g, "")
    .replace(/https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)/gi, "")
    .trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(item);
      }}
      className={`
        group relative flex cursor-pointer flex-col float-card shimmer overflow-hidden
        ${isSelected
          ? "border-[#ff2a5f]/60 ring-2 ring-[#ff2a5f]/30"
          : ""
        }
      `}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute left-3 top-3 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600"
          />
        </div>
      )}

      {/* Thumbnail Images — dibatasi tinggi, klik untuk lightbox */}
      {hasImages && (
        <div className="relative overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
          <div className="relative" style={{ height: "160px" }}>
            <img
              src={images[0]}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
              onClick={(e) => { e.stopPropagation(); onImageClick?.(images[0]); }}
            />
            {/* Image overlay actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); onImageClick?.(images[0]); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopyImage(images[0]); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
              >
                {copiedField === "img" || copiedField === "imgurl" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <a
                href={images[0]}
                download
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                +{images.length - 1}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Top Row: Badge + Title + Favorite */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className={`
              mt-0.5 inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[9px] font-bold tracking-wider uppercase
              border ${config.color}
            `}>
              {config.label}
            </span>
            <h4 className="break-words text-sm font-semibold leading-snug text-white">
              {item.title}
            </h4>
          </div>
          {item.favorite && (
            <Star className="mt-0.5 h-4 w-4 shrink-0 fill-[#ffd700] text-[#ffd700]" />
          )}
        </div>

        {/* Description */}
        {textPreview && (
          <div className="mt-4 mb-5">
            <p className="line-clamp-3 text-[13px] leading-relaxed text-white/50">
              {truncate(textPreview, 200)}
            </p>
          </div>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white/60"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[11px] text-white/40">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: Meta + Actions */}
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Clock className="h-3 w-3" />
            <span>{formatRelative(item.updated_at || item.created_at)}</span>
            <span className="mx-1">·</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5">{item.category}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Tooltip text={item.favorite ? "Hapus favorit" : "Favoritkan"}>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id, item.favorite); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-[#ffd700]"
              >
                <Heart className={`h-4 w-4 ${item.favorite ? "fill-[#ffd700] text-[#ffd700]" : ""}`} />
              </button>
            </Tooltip>

            <Tooltip text="Salin konten">
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(item.content, "content"); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                {copiedField === "content" ? <Check className="h-4 w-4 text-[#00ff88]" /> : <Copy className="h-4 w-4" />}
              </button>
            </Tooltip>

            {/* Dropdown menu — Edit & Delete */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 bottom-full z-30 mb-1 w-40 rounded-xl border border-white/10 bg-[#0a0a0e] py-1 shadow-xl">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(item); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Item
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#ff5c7a] transition-colors hover:bg-[#ff2a5f]/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

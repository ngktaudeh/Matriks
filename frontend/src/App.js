import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase, hasSupabaseConfig } from "@/lib/supabaseClient";
import { tanyaKimi, CATEGORIES } from "./kimi";
import {
  Search,
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  Star,
  Sun,
  Moon,
  Menu,
  X,
  Layers,
  Link2,
  Folder,
  ArrowDownUp,
  Info,
  Image as ImageIcon,
  ImagePlus,
  Download,
  Upload,
  LogOut,
  Loader2,
  AlertTriangle,
  MoreVertical,
  Lock,
  BadgeCheck,
  KeyRound,
  Sparkles,
  ArrowLeft,
  FileText,
  Send,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const THEME_KEY = "bjs-theme";

const APP_TITLE = "Bank Jawaban CS";

// Default "Topik Layanan" — hanya di-seed kalau tabel kategori kosong.
const DEFAULT_CATEGORIES = [
  "Salam & Pembuka",
  "Komplain",
  "Pengiriman",
  "Refund/Pengembalian",
  "Pembayaran",
  "FAQ Umum",
  "Penutup Chat",
];

const CATEGORY_ICONS = {
  All: Layers,
  Archive: Folder,
};

// Aksen warna per kategori (light tint) untuk scanning visual cepat.
const CATEGORY_ACCENTS = {
  "salam & pembuka": { bg: "hsl(152 60% 94%)", fg: "hsl(160 60% 22%)", ring: "hsl(152 50% 70%)" },
  "komplain": { bg: "hsl(350 80% 95%)", fg: "hsl(350 60% 30%)", ring: "hsl(350 60% 78%)" },
  "pengiriman": { bg: "hsl(210 80% 94%)", fg: "hsl(215 60% 28%)", ring: "hsl(210 55% 74%)" },
  "refund/pengembalian": { bg: "hsl(45 90% 92%)", fg: "hsl(40 60% 28%)", ring: "hsl(42 70% 70%)" },
  "pembayaran": { bg: "hsl(170 70% 92%)", fg: "hsl(172 55% 26%)", ring: "hsl(170 45% 70%)" },
  "faq umum": { bg: "hsl(260 60% 95%)", fg: "hsl(262 50% 32%)", ring: "hsl(260 45% 78%)" },
  "penutup chat": { bg: "hsl(200 60% 94%)", fg: "hsl(205 55% 28%)", ring: "hsl(200 45% 72%)" },
};

const ACCENT_FALLBACK = [
  { bg: "hsl(0 0% 95%)", fg: "hsl(0 0% 30%)", ring: "hsl(0 0% 80%)" },
  { bg: "hsl(220 70% 94%)", fg: "hsl(222 55% 28%)", ring: "hsl(220 50% 75%)" },
  { bg: "hsl(35 85% 93%)", fg: "hsl(32 60% 28%)", ring: "hsl(34 65% 72%)" },
  { bg: "hsl(280 60% 95%)", fg: "hsl(282 50% 30%)", ring: "hsl(280 45% 78%)" },
  { bg: "hsl(150 60% 93%)", fg: "hsl(155 55% 26%)", ring: "hsl(150 45% 72%)" },
];

const accentFor = (name) => {
  const key = (name || "").toLowerCase();
  if (CATEGORY_ACCENTS[key]) return CATEGORY_ACCENTS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ACCENT_FALLBACK[h % ACCENT_FALLBACK.length];
};

const SORTS = [
  { id: "newest", label: "Terbaru" },
  { id: "popular", label: "Sering Dipakai" },
  { id: "az", label: "A–Z" },
  { id: "fav", label: "Favorit" },
];

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/* ---- placeholder / variabel ---- */
const extractVars = (text) => {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const vars = [];
  let m;
  while ((m = re.exec(text || "")) !== null) {
    if (!vars.includes(m[1])) vars.push(m[1]);
  }
  return vars;
};

const fillVars = (text, values) =>
  (text || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, k) => (values[k] !== undefined && values[k] !== "" ? values[k] : `{{${k}}}`)
  );

const relativeTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Diperbarui barusan";
  if (mins < 60) return `Diperbarui ${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Diperbarui ${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Diperbarui kemarin";
  return `Diperbarui ${days} hari lalu`;
};

const writeClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

const Tag = ({ children }) => (
  <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
    #{children}
  </span>
);

const VerifiedBadge = () => (
  <span
    title="Terverifikasi/Official"
    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
  >
    <BadgeCheck size={13} />
    Terverifikasi
  </span>
);

const CopyButton = ({ text, onBeforeCopy, testid, label = "Salin", size = "md" }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const onCopy = () => {
    if (busy) return;
    setBusy(true);
    try {
      let finalText = text;
      if (onBeforeCopy) {
        const r = onBeforeCopy();
        if (r === null || r === undefined) {
          setBusy(false);
          return;
        }
        finalText = r;
      }
      // Clipboard write is the FIRST synchronous side-effect inside the
      // click handler — no await before it, so browsers accept it.
      writeClipboard(finalText);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error(err.message || "Gagal menyalin");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      data-testid={testid}
      onClick={onCopy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-150 ${
        size === "lg"
          ? "px-4 py-2.5 text-sm"
          : "px-2.5 py-1.5 text-xs"
      } ${
        copied
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
      }`}
    >
      {copied ? <Check size={size === "lg" ? 16 : 14} /> : <Copy size={size === "lg" ? 16 : 14} />}
      {copied ? "Tersalin!" : label}
    </button>
  );
};

const CopyImageButton = ({ imageUrl, testid, label = "Salin Gambar" }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const onCopy = async () => {
    if (!imageUrl || busy) return;
    setBusy(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Gagal mengambil gambar");
      const blob = await res.blob();

      const canWriteImage =
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.write === "function";

      if (!canWriteImage) {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
        toast.error(
          "Browser tidak mendukung salin gambar langsung — klik kanan gambar untuk menyimpan"
        );
        return;
      }

      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error(err.message || "Gagal menyalin gambar");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      data-testid={testid}
      onClick={onCopy}
      disabled={!imageUrl || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        copied
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "border border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {copied ? <Check size={14} /> : busy ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
      {copied ? "Tersalin!" : label}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/*  Item card (compact / dense)                                        */
/* ------------------------------------------------------------------ */

const ItemCard = ({ item, isAdmin, onOpen, onEdit, onDelete, onCopy, onToggleFav, onOpenImage }) => {
  const accent = accentFor(item.category);
  const vars = extractVars(item.content);

  return (
    <div
      data-testid={`item-card-${item.id}`}
      style={{
        borderColor: isAdmin ? accent.ring : undefined,
        boxShadow: isAdmin ? `inset 0 0 0 1px ${accent.ring}` : undefined,
      }}
      className="card-surface card-surface-hover group flex flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5"
    >
      {item.image_url && (
        <div
          className="-mx-4 -mt-4 mb-3 cursor-zoom-in overflow-hidden rounded-t-xl"
          onClick={(e) => {
            e.stopPropagation();
            onOpenImage(item.image_url);
          }}
        >
          <img
            data-testid={`item-image-${item.id}`}
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="aspect-video w-full object-cover bg-secondary"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onOpen(item)}
          className="min-w-0 flex-1 text-left"
          data-testid={`item-title-${item.id}`}
        >
          <h3 className="font-sans text-[17px] font-bold leading-snug tracking-tight text-card-foreground line-clamp-2 hover:text-primary">
            {item.title}
          </h3>
        </button>
        <button
          data-testid={`favorite-toggle-${item.id}`}
          onClick={() => onToggleFav(item)}
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          aria-label="Toggle favorite"
        >
          <Star
            size={16}
            className={item.favorite ? "fill-amber-400 text-amber-400" : ""}
          />
        </button>
      </div>

      <p className="mt-1.5 flex-1 whitespace-pre-wrap break-words font-serif text-[14px] leading-relaxed text-muted-foreground line-clamp-3">
        {item.content}
      </p>

      {item.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="truncate rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: accent.bg, color: accent.fg }}
          >
            {item.category}
          </span>
          {item.is_verified && <VerifiedBadge />}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {relativeTime(item.updated_at)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <CopyButton
          text={item.content}
          testid={`copy-btn-${item.id}`}
          onBeforeCopy={() => onCopy(item)}
          label="Salin"
          size="lg"
        />
        <div className="flex items-center gap-0.5">
          {item.image_url && (
            <CopyImageButton imageUrl={item.image_url} testid={`copy-image-btn-${item.id}`} />
          )}
          {isAdmin && (
            <>
              <button
                data-testid={`edit-btn-${item.id}`}
                onClick={() => onEdit(item)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                aria-label="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                data-testid={`delete-btn-${item.id}`}
                onClick={() => onDelete(item)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Variable fill modal (placeholder {{...}})                          */
/* ------------------------------------------------------------------ */

const VariableFillModal = ({ target, onClose, onConfirm }) => {
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      const init = {};
      target.vars.forEach((v) => (init[v] = ""));
      setValues(init);
      setBusy(false);
    }
  }, [target]);

  if (!target) return null;

  const submit = async () => {
    setBusy(true);
    await onConfirm(values);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="variable-fill-modal"
        className="w-full max-w-sm rounded-t-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in sm:rounded-2xl"
      >
        <h3 className="font-sans text-lg font-semibold">Lengkapi variabel</h3>
        <p className="mt-1 font-serif text-[14px] text-muted-foreground">
          Isi nilai untuk placeholder di jawaban ini sebelum disalin.
        </p>
        <div className="mt-4 space-y-3">
          {target.vars.map((v) => (
            <div key={v}>
              <label className="mb-1 block font-sans text-sm font-medium">
                {v.replace(/_/g, " ")}
              </label>
              <input
                autoFocus
                value={values[v] || ""}
                onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={`{{${v}}}`}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="variable-copy-btn"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
            Salin
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Item modal (tambah / edit)                                         */
/* ------------------------------------------------------------------ */

const emptyDraft = (category, fallback = "FAQ Umum") => ({
  id: null,
  title: "",
  subtitle: "",
  content: "",
  image_url: null,
  tags: [],
  category: category && !["All", "Archive"].includes(category) ? category : fallback,
  favorite: false,
  is_verified: false,
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;

// Resize + re-encode image client-side (canvas) before upload.
// Falls back to the original file if anything goes wrong.
const compressImage = (file) =>
  new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, MAX_IMAGE_WIDTH / Math.max(w, h));
        if (scale >= 1 && file.size <= MAX_IMAGE_BYTES) {
          URL.revokeObjectURL(url);
          return resolve(file);
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Use JPEG for photos (smaller); keep PNG only for small/transparent images.
        const isSmallPng = file.type === "image/png" && file.size < 500 * 1024;
        const mime = isSmallPng ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            const ext = mime === "image/png" ? "png" : "jpg";
            const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
            const out = new File([blob], name, { type: mime });
            resolve(out);
          },
          mime,
          IMAGE_QUALITY
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

const ItemModal = ({ open, draft, categories, userId, onClose, onSave }) => {
  const [form, setForm] = useState(draft);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(draft);
      setTagInput((draft.tags || []).join(", "));
      setSaving(false);
      setUploading(false);
      setImageError("");
      setDragOver(false);
    }
  }, [open, draft]);

  if (!open) return null;

  const validateFile = (file) => {
    if (!file) return false;
    if (!file.type.startsWith("image/")) {
      setImageError("Pilih file gambar (jpg, jpeg, png, webp, gif, svg).");
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Gambar maksimal 5MB.");
      return false;
    }
    setImageError("");
    return true;
  };

  const onPickFile = async (file) => {
    if (!validateFile(file)) return;
    const compressed = await compressImage(file);
    setForm((f) => ({ ...f, image_file: compressed, image_url: URL.createObjectURL(compressed) }));
  };

  const onRemoveImage = () => {
    setForm((f) => ({ ...f, image_file: null, image_url: null, image_removed: true }));
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    setSaving(true);
    try {
      let image_url = form.image_url || null;

      if (form.image_file) {
        setUploading(true);
        const safeName =
          form.image_file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "image";
        const path = `${userId || "admin"}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(path, form.image_file, {
            cacheControl: "3600",
            upsert: false,
            contentType: form.image_file.type,
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
        image_url = pub?.publicUrl || null;
        setUploading(false);
      } else if (form.image_removed) {
        image_url = null;
      }

      const ok = await onSave({
        ...form,
        title: form.title.trim(),
        image_url,
        tags,
      });
      if (!ok) {
        setSaving(false);
        setUploading(false);
      }
    } catch (err) {
      toast.error(err.message || "Upload gambar gagal");
      setSaving(false);
      setUploading(false);
    }
  };

  const catOptions = categories.filter((c) => !["All", "Archive"].includes(c));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="item-modal"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl animate-scale-in sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-sans text-lg font-semibold">
            {form.id ? "Edit jawaban" : "Tambah jawaban"}
          </h2>
          <button
            data-testid="modal-close-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="vault-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block font-sans text-sm font-medium">Judul</label>
            <input
              data-testid="modal-title-input"
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="cth: Cara reset password"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-sm font-medium">
              Isi jawaban{" "}
              <span className="font-normal text-muted-foreground">
                (dukung {"{{variabel}}"})
              </span>
            </label>
            <textarea
              data-testid="modal-content-input"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={9}
              placeholder={"Halo {{nama_customer}}, terima kasih sudah menghubungi kami…"}
              className="vault-scroll w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 font-serif text-[15px] leading-relaxed outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-sm font-medium">
              Gambar{" "}
              <span className="font-normal text-muted-foreground">(opsional, max 5MB)</span>
            </label>

            {form.image_url ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  data-testid="modal-image-preview"
                  src={form.image_url}
                  alt="Preview"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-3 py-2">
                  <span className="truncate font-sans text-xs text-muted-foreground">
                    {form.image_file?.name || "Gambar saat ini"}
                  </span>
                  <button
                    data-testid="modal-image-remove-btn"
                    onClick={onRemoveImage}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div
                data-testid="modal-image-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) onPickFile(file);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors duration-150 ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40"
                }`}
              >
                {uploading ? (
                  <Loader2 size={22} className="animate-spin text-primary" />
                ) : (
                  <ImagePlus size={22} className="text-muted-foreground" />
                )}
                <p className="mt-2 font-sans text-sm font-medium">
                  {uploading ? "Mengunggah…" : "Klik untuk pilih / drag & drop gambar"}
                </p>
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF atau SVG · max 5MB
                </p>
              </div>
            )}

            {imageError && (
              <p data-testid="modal-image-error" className="mt-2 font-sans text-xs font-medium text-destructive">
                {imageError}
              </p>
            )}

            <input
              ref={fileRef}
              data-testid="modal-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-sans text-sm font-medium">Topik Layanan</label>
              <select
                data-testid="modal-category-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
              >
                {catOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-sm font-medium">
                Tag <span className="font-normal text-muted-foreground">(pisahkan koma)</span>
              </label>
              <input
                data-testid="modal-tags-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="refund, pengiriman"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              data-testid="modal-favorite-toggle"
              onClick={() => setForm({ ...form, favorite: !form.favorite })}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-sans text-sm font-medium transition-colors duration-150 ${
                form.favorite
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                  : "border-input text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Star size={16} className={form.favorite ? "fill-amber-400 text-amber-400" : ""} />
              {form.favorite ? "Favorit" : "Tandai favorit"}
            </button>

            <button
              data-testid="modal-verified-toggle"
              onClick={() => setForm({ ...form, is_verified: !form.is_verified })}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-sans text-sm font-medium transition-colors duration-150 ${
                form.is_verified
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-input text-muted-foreground hover:bg-secondary"
              }`}
            >
              <BadgeCheck size={16} className={form.is_verified ? "text-emerald-500" : ""} />
              {form.is_verified ? "Terverifikasi" : "Tandai terverifikasi"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            data-testid="modal-cancel-btn"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="modal-save-btn"
            onClick={save}
            disabled={!form.title.trim() || saving || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {(saving || uploading) && <Loader2 size={15} className="animate-spin" />}
            {form.id ? "Simpan perubahan" : "Simpan jawaban"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Full-screen image lightbox                                         */
/* ------------------------------------------------------------------ */

const ImageLightbox = ({ imageUrl, onClose }) => {
  useEffect(() => {
    if (!imageUrl) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      data-testid="image-lightbox"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        data-testid="lightbox-close-btn"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white transition-colors duration-150 hover:bg-white/20"
        aria-label="Close image"
      >
        <X size={20} />
      </button>
      <img
        data-testid="lightbox-image"
        src={imageUrl}
        alt="Full size"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Detail modal                                                       */
/* ------------------------------------------------------------------ */

const DetailModal = ({ item, isAdmin, onClose, onEdit, onDelete, onCopy, onOpenImage }) => {
  if (!item) return null;
  const accent = accentFor(item.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="detail-modal"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl animate-scale-in sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-sans text-lg font-semibold">Detail jawaban</h2>
          <button
            data-testid="detail-close-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="vault-scroll flex-1 overflow-y-auto">
          {item.image_url && (
            <img
              data-testid="detail-image"
              src={item.image_url}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onClick={() => onOpenImage(item.image_url)}
              className="aspect-video max-h-72 w-full cursor-zoom-in bg-secondary object-cover"
            />
          )}

          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 data-testid="detail-title" className="font-display text-2xl font-bold leading-snug tracking-wide">
                  {item.title}
                </h3>
                {item.is_verified && (
                  <div className="mt-1.5">
                    <VerifiedBadge />
                  </div>
                )}
              </div>
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: accent.bg, color: accent.fg }}
              >
                {item.category}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
              <CopyButton
                text={item.content}
                testid="detail-copy-btn"
                onBeforeCopy={() => onCopy(item)}
                label="Salin Jawaban"
              />
              <CopyImageButton imageUrl={item.image_url} testid="detail-copy-image-btn" label="Salin Gambar" />
              <span className="text-[11px] text-muted-foreground">
                {relativeTime(item.updated_at)}
              </span>
            </div>

            {item.content && (
              <p
                data-testid="detail-content"
                className="whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-foreground"
              >
                {item.content}
              </p>
            )}

            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              data-testid="detail-delete-btn"
              onClick={() => onDelete(item)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-sm font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10"
            >
              <Trash2 size={15} />
              Hapus
            </button>
            <button
              data-testid="detail-edit-btn"
              onClick={() => onEdit(item)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90"
            >
              <Pencil size={15} />
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Category (topic) modals                                            */
/* ------------------------------------------------------------------ */

const NewCategoryModal = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setSaving(false); }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onCreate(name.trim());
    if (!ok) setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="new-category-modal"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
      >
        <h3 className="font-sans text-lg font-semibold">Topik Layanan baru</h3>
        <p className="mt-1 font-serif text-[14px] text-muted-foreground">
          Kelompokkan jawaban ke dalam satu topik.
        </p>
        <input
          data-testid="new-category-input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="cth: Akun & Verifikasi"
          className="mt-4 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            data-testid="new-category-cancel-btn"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="new-category-create-btn"
            onClick={submit}
            disabled={!name.trim() || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Buat
          </button>
        </div>
      </div>
    </div>
  );
};

const RenameCategoryModal = ({ open, current, onClose, onRename }) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(current || ""); setSaving(false); }
  }, [open, current]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onRename(name.trim());
    if (!ok) setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="rename-category-modal"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
      >
        <h3 className="font-sans text-lg font-semibold">Ganti nama topik</h3>
        <p className="mt-1 font-serif text-[14px] text-muted-foreground">
          Semua jawaban di “{current}” otomatis pindah ke nama baru.
        </p>
        <input
          data-testid="rename-category-input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mt-4 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            data-testid="rename-category-cancel-btn"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="rename-category-save-btn"
            onClick={submit}
            disabled={!name.trim() || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmCategoryDelete = ({ name, onCancel, onConfirm }) => {
  if (!name) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        data-testid="delete-category-confirm"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
      >
        <h3 className="font-sans text-lg font-semibold">Hapus topik?</h3>
        <p className="mt-2 font-serif text-[14px] text-muted-foreground">
          “{name}” akan dihapus. Jawaban di dalamnya dipindah ke Archive (tidak dihapus).
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            data-testid="delete-category-cancel-btn"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="delete-category-confirm-btn"
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground transition-all duration-150 hover:opacity-90"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDelete = ({ item, onCancel, onConfirm }) => {
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        data-testid="delete-confirm"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
      >
        <h3 className="font-sans text-lg font-semibold">Hapus jawaban?</h3>
        <p className="mt-2 font-serif text-[14px] text-muted-foreground">
          “{item.title}” akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            data-testid="delete-cancel-btn"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Batal
          </button>
          <button
            data-testid="delete-confirm-btn"
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground transition-all duration-150 hover:opacity-90"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Login / Register modal                                             */
/* ------------------------------------------------------------------ */

const LoginModal = ({ open, onClose, onSuccess }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setBusy(false); setMode("login"); setPassword(""); }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Login berhasil");
        onSuccess();
      } else {
        // Daftar sebagai admin (masuk antrean persetujuan owner)
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Cek email untuk konfirmasi akun");
        } else {
          // Auto-register as pending admin for owner approval
          const { error: regErr } = await supabase
            .from("admins")
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              role: "admin",
              status: "pending",
            });
          if (regErr) {
            console.warn("register pending admin:", regErr.message);
          }
          toast.success("Akun dibuat — menunggu persetujuan owner");
          onSuccess();
        }
      }
    } catch (err) {
      toast.error(err.message || "Autentikasi gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="login-modal"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold">
            {mode === "login" ? "Login" : "Daftar Admin"}
          </h2>
          <button
            data-testid="login-close-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="mb-1.5 block font-sans text-sm font-medium">Email</label>
          <input
            data-testid="login-email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="mb-3 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          <label className="mb-1.5 block font-sans text-sm font-medium">Password</label>
          <input
            data-testid="login-password-input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-4 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          data-testid="login-mode-toggle"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-3 w-full text-center font-sans text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          {mode === "login"
            ? "Belum punya akun? Daftar sebagai admin"
            : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const Sidebar = ({
  categories,
  active,
  onSelect,
  counts,
  search,
  setSearch,
  isAdmin,
  canUseAI,
  matrixOpen,
  onOpenMatrix,
  onNewCategory,
  onClose,
  userEmail,
  onLogout,
  onRenameCategory,
  onDeleteCategory,
}) => {
  const [menuFor, setMenuFor] = useState(null);
  const isEditable = (cat) => isAdmin && !["All", "Archive"].includes(cat);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound size={19} />
          </div>
          <div>
            <p className="font-display text-[16px] font-semibold leading-tight tracking-wide">{APP_TITLE}</p>
            <p className="font-sans text-[11px] text-muted-foreground">
              {counts.total} jawaban
            </p>
          </div>
        </div>
        <button
          data-testid="sidebar-close-btn"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="vault-scroll flex-1 space-y-0.5 overflow-y-auto px-3">
        <SidebarRow
          cat="All"
          active={active}
          onSelect={onSelect}
          count={counts.All ?? 0}
          icon="all"
          editable={false}
        />
        {categories.map((cat) => (
          <SidebarRow
            key={cat}
            cat={cat}
            active={active}
            onSelect={onSelect}
            count={counts[cat] ?? 0}
            icon="topic"
            editable={isEditable(cat)}
            menuFor={menuFor}
            setMenuFor={setMenuFor}
            onRenameCategory={onRenameCategory}
            onDeleteCategory={onDeleteCategory}
          />
        ))}
        <SidebarRow
          cat="Archive"
          active={active}
          onSelect={onSelect}
          count={counts.Archive ?? 0}
          icon="archive"
          editable={false}
        />
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        {isAdmin && (
          <button
            data-testid="new-category-btn"
            onClick={onNewCategory}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <Plus size={16} />
            Topik Baru
          </button>
        )}

        {canUseAI && (
          <button
            data-testid="matrix-ai-btn"
            onClick={onOpenMatrix}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-semibold transition-colors duration-150 ${
              matrixOpen
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-violet-500/15 text-violet-600 hover:bg-violet-500/25 dark:text-violet-300"
            }`}
          >
            <Sparkles size={16} />
            Matriks.ai
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="truncate font-sans text-xs text-muted-foreground" title={userEmail}>
          {userEmail || "Belum login"}
        </span>
        {isAdmin && (
          <button
            data-testid="logout-btn"
            onClick={onLogout}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={14} />
            Keluar
          </button>
        )}
      </div>
    </div>
  );
};

const SidebarRow = ({
  cat,
  active,
  onSelect,
  count,
  icon,
  editable,
  menuFor,
  setMenuFor,
  onRenameCategory,
  onDeleteCategory,
}) => {
  const Icon =
    icon === "all" ? Layers : icon === "archive" ? Folder : Folder;
  const isActive = active === cat;
  const accent = accentFor(cat);

  return (
    <div className="group relative">
      <div
        data-testid={`category-${cat.toLowerCase()}`}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(cat)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(cat)}
        onContextMenu={(e) => {
          if (editable) {
            e.preventDefault();
            setMenuFor((m) => (m === cat ? null : cat));
          }
        }}
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors duration-150 ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent.ring }}
          />
          <span className="truncate">{cat}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {editable && (
            <button
              data-testid={`category-menu-btn-${cat.toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuFor((m) => (m === cat ? null : cat));
              }}
              className={`rounded p-0.5 hover:bg-background/70 ${
                menuFor === cat ? "inline-flex" : "hidden group-hover:inline-flex"
              }`}
              aria-label="Opsi topik"
            >
              <MoreVertical size={14} />
            </button>
          )}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              isActive ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
            }`}
          >
            {count}
          </span>
        </span>
      </div>

      {menuFor === cat && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuFor(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuFor(null);
            }}
          />
          <div
            data-testid={`category-menu-${cat.toLowerCase()}`}
            className="absolute right-2 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl animate-scale-in"
          >
            <button
              data-testid={`rename-category-${cat.toLowerCase()}`}
              onClick={() => {
                setMenuFor(null);
                onRenameCategory(cat);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-sans text-sm text-popover-foreground transition-colors duration-150 hover:bg-secondary"
            >
              <Pencil size={14} />
              Ganti nama
            </button>
            <button
              data-testid={`delete-category-${cat.toLowerCase()}`}
              onClick={() => {
                setMenuFor(null);
                onDeleteCategory(cat);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-sans text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Profile modal (own account + owner admin management)               */
/* ------------------------------------------------------------------ */

const ProfileModal = ({
  open,
  onClose,
  session,
  isAdmin,
  isOwner,
  myRole,
  myStatus,
  admins,
  pendingCount,
  onChangePassword,
  onApproveAdmin,
  onRejectAdmin,
  onRemoveAdmin,
  onToggleAiAccess,
}) => {
  const [tab, setTab] = useState("profile");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setTab("profile"); setPw1(""); setPw2(""); setBusy(false); }
  }, [open]);

  if (!open) return null;

  const submitPw = async (e) => {
    e.preventDefault();
    if (pw1.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (pw1 !== pw2) { toast.error("Konfirmasi password tidak cocok"); return; }
    setBusy(true);
    const ok = await onChangePassword(pw1);
    setBusy(false);
    if (ok) { setPw1(""); setPw2(""); }
  };

  const roleLabel = (r, s) => {
    if (r === "owner") return "Owner";
    if (s === "pending") return "Menunggu persetujuan";
    if (s === "rejected") return "Ditolak";
    return "Admin";
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="profile-modal"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl animate-scale-in sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-sans text-lg font-semibold">Profil</h2>
          <button
            data-testid="profile-close-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-6 py-2">
          <button
            data-testid="profile-tab-profile"
            onClick={() => setTab("profile")}
            className={`rounded-lg px-3 py-1.5 font-sans text-sm font-semibold transition-colors duration-150 ${
              tab === "profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Akun saya
          </button>
          {isOwner && (
            <button
              data-testid="profile-tab-admins"
              onClick={() => setTab("admins")}
              className={`relative rounded-lg px-3 py-1.5 font-sans text-sm font-semibold transition-colors duration-150 ${
                tab === "admins" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kelola Admin
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="vault-scroll flex-1 overflow-y-auto px-6 py-5">
          {tab === "profile" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {(session?.user?.email || "A")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-sans text-sm font-semibold">
                      {session?.user?.email}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground">
                      {roleLabel(myRole, myStatus)}
                    </p>
                  </div>
                </div>
              </div>

              {!isAdmin && myStatus === "pending" && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 font-sans text-sm text-amber-600 dark:text-amber-400">
                  Akun Anda menunggu persetujuan owner. Setelah disetujui, Anda akan mendapat akses edit.
                </div>
              )}

              <div>
                <h3 className="mb-2 font-sans text-sm font-semibold">Ganti password</h3>
                <form onSubmit={submitPw} className="space-y-3">
                  <input
                    data-testid="profile-new-password"
                    type="password"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    placeholder="Password baru (min 6 karakter)"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <input
                    data-testid="profile-confirm-password"
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    data-testid="profile-change-password-btn"
                    type="submit"
                    disabled={busy || !pw1 || !pw2}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 disabled:opacity-40"
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    Simpan password
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === "admins" && isOwner && (
            <div className="space-y-3">
              <p className="font-sans text-sm text-muted-foreground">
                Berikut daftar admin. Terima permintaan pendaftaran, atur akses Matriks.ai, atau hapus akses admin lain.
              </p>
              {admins.length === 0 ? (
                <p className="font-serif text-[14px] text-muted-foreground">Belum ada admin lain.</p>
              ) : (
                admins.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-medium">{a.email}</p>
                      <p className="font-sans text-xs text-muted-foreground">
                        {roleLabel(a.role, a.status)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {a.status === "pending" && (
                        <>
                          <button
                            data-testid={`approve-admin-${a.email}`}
                            onClick={() => onApproveAdmin(a)}
                            className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 font-sans text-xs font-semibold text-emerald-600 transition-colors duration-150 hover:bg-emerald-500/25 dark:text-emerald-400"
                          >
                            Terima
                          </button>
                          <button
                            data-testid={`reject-admin-${a.email}`}
                            onClick={() => onRejectAdmin(a)}
                            className="rounded-lg bg-destructive/10 px-2.5 py-1.5 font-sans text-xs font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/20"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      {a.role !== "owner" && a.status === "approved" && (
                        <>
                          <button
                            data-testid={`toggle-ai-${a.email}`}
                            onClick={() => onToggleAiAccess(a)}
                            className={`rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold transition-colors duration-150 ${
                              a.ai_access
                                ? "bg-violet-500/15 text-violet-600 hover:bg-violet-500/25 dark:text-violet-300"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                            }`}
                            title={a.ai_access ? "Matriks.ai aktif — klik untuk nonaktifkan" : "Matriks.ai nonaktif — klik untuk aktifkan"}
                          >
                            <Sparkles size={13} className="mr-1 inline" />
                            {a.ai_access ? "AI aktif" : "AI mati"}
                          </button>
                          <button
                            data-testid={`remove-admin-${a.email}`}
                            onClick={() => onRemoveAdmin(a)}
                            className="rounded-lg bg-destructive/10 px-2.5 py-1.5 font-sans text-xs font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/20"
                          >
                            Hapus akses
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Config error screen                                                */
/* ------------------------------------------------------------------ */

const ConfigError = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
    <div
      data-testid="config-error"
      className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle size={24} />
      </div>
      <h1 className="mt-4 text-xl font-bold">Supabase belum dikonfigurasi</h1>
      <p className="mt-2 font-serif text-[15px] text-muted-foreground">
        Set{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">REACT_APP_SUPABASE_URL</code>{" "}
        dan{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">REACT_APP_SUPABASE_ANON_KEY</code>{" "}
        di <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">frontend/.env</code> lalu
        restart aplikasi.
      </p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Kimi design assistant panel                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Matriks.ai — fullscreen Kimi-style assistant                        */
/* ------------------------------------------------------------------ */

const MatriksAIFullscreen = ({ theme, setTheme, onClose, session }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Halo! Saya Kimi, siap membantu Anda. Apa yang ingin Anda tanyakan hari ini?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("cs");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll ke bawah setiap ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      type: file.type,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setShowWelcome(false);
    e.target.value = "";
  };

  const removeFile = (id) => {
    setAttachedFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userContent = input.trim();
    let finalContent = userContent;

    // Format pesan dengan info file jika ada
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map((f) => `[File: ${f.name}]`).join(", ");
      finalContent = userContent ? `${userContent}\n\n${fileNames}` : fileNames;
    }

    const userMessage = {
      role: "user",
      content: finalContent,
      files: attachedFiles,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setLoading(true);
    setShowWelcome(false);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const hasil = await tanyaKimi(finalContent, category, {
        history,
        model: "kimi-k3",
        reasoning_effort: "max",
        files: userMessage.files,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: hasil || "Tidak ada jawaban." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Terjadi kesalahan: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (loading) return;
    setMessages([
      {
        role: "assistant",
        content: "Halo! Saya Kimi, siap membantu Anda. Apa yang ingin Anda tanyakan hari ini?",
      },
    ]);
    setInput("");
    setAttachedFiles([]);
    setShowWelcome(true);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#f5f5f5] dark:bg-[#1a1a1a]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            data-testid="ai-back-btn"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Kimi AI</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Powered by Moonshot AI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            data-testid="kimi-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none transition-colors focus:border-indigo-300 dark:focus:border-indigo-700"
          >
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          {messages.length > 1 && (
            <button
              data-testid="ai-reset-btn"
              onClick={handleReset}
              disabled={loading}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Baru
            </button>
          )}

          <button
            data-testid="ai-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Welcome Screen */}
          {showWelcome && messages.length <= 1 && (
            <div className="mt-20 flex flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Selamat datang di Kimi
              </h2>
              <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
                Asisten AI serba bisa untuk coding, desain, analisis, dan banyak lagi.
                Mulai percakapan atau upload file.
              </p>

              <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Jelaskan konsep React Hooks",
                  "Bantu saya debug kode ini",
                  "Buatkan email profesional",
                  "Analisis data penjualan",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      setShowWelcome(false);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left text-sm text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <span className="text-xs font-bold">
                        {session?.user?.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    ) : (
                      <Sparkles size={14} />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`group relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-500 text-white rounded-br-md"
                        : "bg-white dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-md shadow-sm"
                    }`}
                  >
                    {/* File attachments display */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.files.map((file) => (
                          <div
                            key={file.id}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                              msg.role === "user"
                                ? "bg-indigo-400/30"
                                : "bg-gray-100 dark:bg-gray-700"
                            }`}
                          >
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt=""
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <FileText size={14} />
                            )}
                            <span className="truncate max-w-[120px]">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Copy button untuk pesan AI */}
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => writeClipboard(msg.content)}
                        className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-indigo-500 flex items-center gap-1"
                      >
                        <Copy size={12} /> Salin
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-white dark:bg-[#2a2a2a] border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div
                        className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md px-4 py-4">
        <div className="mx-auto max-w-3xl">
          {/* File attachments preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs"
                >
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <FileText size={16} className="text-gray-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <span className="text-gray-400">{file.size}</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="ml-1 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Hapus file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 dark:focus-within:border-indigo-700 transition-all">
            {/* Upload button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title="Upload gambar atau file"
            >
              <Plus size={20} />
            </button>

            {/* Textarea */}
            <textarea
              ref={(el) => {
                textareaRef.current = el;
                inputRef.current = el;
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan apa saja, atau upload file..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none max-h-[200px]"
            />

            {/* Send Button */}
            <button
              data-testid="kimi-ask-btn"
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || loading}
              className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                (input.trim() || attachedFiles.length > 0) && !loading
                  ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
              }`}
              title="Kirim"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-gray-400">
            AI dapat membuat kesalahan. Verifikasi informasi penting.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

const Dashboard = ({ session, theme, setTheme }) => {
  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || "";

  const [items, setItems] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [admins, setAdmins] = useState([]);

  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft("All"));
  const [detailItem, setDetailItem] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [copyTarget, setCopyTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const searchRef = useRef(null);

  // my admin record (role/status) derived from admins list
  const myRecord = useMemo(
    () => admins.find((a) => (a.email || "").toLowerCase() === userEmail.toLowerCase()) || null,
    [admins, userEmail]
  );
  const isOwner = myRecord?.role === "owner";
  const isApproved = myRecord?.status === "approved";
  const isAdmin = isOwner || isApproved;
  // Owner selalu boleh pakai Matriks.ai; admin lain hanya kalau diaktifkan owner.
  const canUseAI = isOwner || myRecord?.ai_access === true;
  const pendingCount = useMemo(() => admins.filter((a) => a.status === "pending").length, [admins]);

  /* ---- fetch admins ---- */
  const fetchAdmins = useCallback(async () => {
    const { data, error } = await supabase
      .from("admins")
      .select("id,email,role,status,created_at,ai_access")
      .order("created_at", { ascending: true });
    if (error) {
      // non-owner sees only approved/self; swallowing is fine but surface softly
      console.warn("fetch admins:", error.message);
      setAdmins([]);
      return;
    }
    setAdmins(data || []);
  }, []);

  useEffect(() => {
    if (session) fetchAdmins();
  }, [session, fetchAdmins]);

  /* ---- realtime on admins (owner notification on new signup) ---- */
  useEffect(() => {
    if (!isOwner) return;
    const channel = supabase
      .channel("admins-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admins" }, () => {
        fetchAdmins();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isOwner, fetchAdmins]);

  /* ---- data fetching (shared pool, no user filter) ---- */
  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message || "Gagal memuat jawaban");
      return;
    }
    setItems(data || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message || "Gagal memuat topik");
      return;
    }
    setCustomCats((data || []).map((c) => ({ id: c.id, name: c.name })));
  }, []);

  const initCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
    let rows = data || [];
    if (rows.length === 0) {
      const defaults = DEFAULT_CATEGORIES.map((name) => ({ name }));
      const { data: seeded } = await supabase.from("categories").insert(defaults).select();
      rows = seeded || [];
    }
    setCustomCats(rows.map((c) => ({ id: c.id, name: c.name })));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchItems(), initCategories()]);
      setLoading(false);
    })();
  }, [fetchItems, initCategories]);

  /* ---- realtime (all clients, incl. anon) ---- */
  useEffect(() => {
    const channel = supabase
      .channel("bjs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => fetchItems()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => fetchCategories()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems, fetchCategories]);

  /* ---- keyboard shortcut Ctrl/Cmd+K ---- */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- categories (union: managed topics + item categories) ---- */
  const itemCats = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category && i.category !== "Archive") set.add(i.category);
    });
    return [...set];
  }, [items]);

  const categories = useMemo(() => {
    const seen = new Set();
    const order = [];
    const push = (c) => {
      if (!c) return;
      const k = c.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      order.push(c);
    };
    customCats.forEach((c) => push(c.name));
    itemCats.forEach(push);
    return order;
  }, [customCats, itemCats]);

  const counts = useMemo(() => {
    const c = { total: items.length, All: 0, Archive: 0 };
    for (const it of items) {
      if (it.category !== "Archive") c.All += 1;
      else c.Archive += 1;
      c[it.category] = (c[it.category] || 0) + 1;
    }
    return c;
  }, [items]);

  /* ---- filter + sort ---- */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((it) => {
      if (active === "All") return it.category !== "Archive";
      if (active === "Archive") return it.category === "Archive";
      return it.category === active;
    });
    if (q) {
      list = list.filter((it) =>
        `${it.title} ${it.subtitle || ""} ${it.content} ${(it.tags || []).join(" ")}`
          .toLowerCase()
          .includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "newest")
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === "popular")
      sorted.sort(
        (a, b) =>
          Number(b.usage_count || 0) - Number(a.usage_count || 0) ||
          new Date(b.created_at) - new Date(a.created_at)
      );
    else if (sort === "az")
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "fav")
      sorted.sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          new Date(b.created_at) - new Date(a.created_at)
      );
    return sorted;
  }, [items, active, search, sort]);

  /* ---- handlers ---- */
  const openNew = () => {
    setDraft(emptyDraft(active, categories[0] || "FAQ Umum"));
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setDraft(item);
    setDetailItem(null);
    setModalOpen(true);
  };
  const openDetail = (item) => setDetailItem(item);
  const openImage = (url) => setLightboxUrl(url);

  const incrementUsage = useCallback((id) => {
    // Fire-and-forget: never block the copy action on network.
    try {
      supabase.rpc("increment_usage_count", { target_id: id }).then(() => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, usage_count: (i.usage_count || 0) + 1 } : i))
        );
      });
    } catch {
      /* non-fatal — counter only */
    }
  }, []);

  /* Copy: resolve variables (synchronously returns text), fire counter in background */
  const requestCopy = useCallback(
    (item) => {
      const vars = extractVars(item.content);
      if (vars.length > 0) {
        setCopyTarget({ item, vars });
        return null; // modal handles the copy
      }
      incrementUsage(item.id);
      return item.content;
    },
    [incrementUsage]
  );

  const confirmVariableCopy = useCallback(
    async (values) => {
      if (!copyTarget) return;
      const text = fillVars(copyTarget.item.content, values);
      await writeClipboard(text);
      incrementUsage(copyTarget.item.id);
      setCopyTarget(null);
      toast.success("Tersalin ke clipboard");
    },
    [copyTarget, incrementUsage]
  );

  const saveItem = async (form) => {
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || "",
        content: form.content,
        image_url: form.image_url || null,
        tags: form.tags,
        category: form.category,
        favorite: form.favorite,
        is_verified: form.is_verified,
      };

      if (form.id) {
        const { data, error } = await supabase
          .from("items")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single();
        if (error) throw error;
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        toast.success("Jawaban diperbarui");
      } else {
        const { data, error } = await supabase
          .from("items")
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        setItems((prev) => [data, ...prev]);
        toast.success("Jawaban dibuat");
      }
      setModalOpen(false);
      return true;
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan jawaban");
      return false;
    }
  };

  const toggleFav = async (item) => {
    const next = !item.favorite;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: next } : i)));
    const { error } = await supabase.from("items").update({ favorite: next }).eq("id", item.id);
    if (error) {
      toast.error(error.message || "Gagal update favorit");
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: item.favorite } : i)));
    }
  };

  const confirmDelete = async () => {
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Gagal menghapus jawaban");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Jawaban dihapus");
  };

  const createCategory = async (name) => {
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error("Topik itu sudah ada");
      return false;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({ name })
      .select()
      .single();
    if (error) {
      toast.error(error.message || "Gagal membuat topik");
      return false;
    }
    setCustomCats((prev) => [...prev, { id: data.id, name: data.name }]);
    setActive(name);
    setCatModalOpen(false);
    setDrawerOpen(false);
    toast.success("Topik dibuat");
    return true;
  };

  const renameCategory = async (newName) => {
    const oldName = renameTarget;
    newName = newName.trim();
    if (!oldName || !newName) return false;
    if (newName.toLowerCase() === oldName.toLowerCase()) {
      setRenameTarget(null);
      return true;
    }
    if (categories.some((c) => c.toLowerCase() === newName.toLowerCase())) {
      toast.error("Topik dengan nama itu sudah ada");
      return false;
    }
    const row = customCats.find((c) => c.name === oldName);

    // Move items first (category is a text field on items).
    const { error: itErr } = await supabase
      .from("items")
      .update({ category: newName })
      .eq("category", oldName);
    if (itErr) {
      toast.error(itErr.message || "Gagal memindahkan jawaban");
      return false;
    }

    if (row) {
      const { error } = await supabase.from("categories").update({ name: newName }).eq("id", row.id);
      if (error) {
        toast.error(error.message || "Gagal ganti nama topik");
        return false;
      }
      setCustomCats((prev) => prev.map((c) => (c.id === row.id ? { ...c, name: newName } : c)));
    } else {
      // Topic exists only in items (not in categories table) — add it.
      const { data } = await supabase.from("categories").insert({ name: newName }).select().single();
      if (data) setCustomCats((prev) => [...prev, { id: data.id, name: data.name }]);
    }

    setItems((prev) => prev.map((i) => (i.category === oldName ? { ...i, category: newName } : i)));
    if (active === oldName) setActive(newName);
    setRenameTarget(null);
    toast.success("Topik diganti nama");
    return true;
  };

  const deleteCategory = async () => {
    const name = catDeleteTarget;
    setCatDeleteTarget(null);
    // Move items to Archive (don't delete data).
    const { error: itErr } = await supabase
      .from("items")
      .update({ category: "Archive" })
      .eq("category", name);
    if (itErr) {
      toast.error(itErr.message || "Gagal memindahkan jawaban");
      return;
    }
    const row = customCats.find((c) => c.name === name);
    if (row) {
      const { error } = await supabase.from("categories").delete().eq("id", row.id);
      if (error) {
        toast.error(error.message || "Gagal menghapus topik");
        return;
      }
    } else {
      // Category may exist only by name in the table (orphan) — delete by name.
      const { error } = await supabase.from("categories").delete().eq("name", name);
      if (error) {
        toast.error(error.message || "Gagal menghapus topik");
        return;
      }
    }
    setCustomCats((prev) => prev.filter((c) => c.name !== name));
    setItems((prev) => prev.map((i) => (i.category === name ? { ...i, category: "Archive" } : i)));
    if (active === name) setActive("All");
    toast.success("Topik dihapus — jawaban dipindah ke Archive");
    // Refetch to guarantee the sidebar stays in sync (defensive).
    fetchCategories();
  };

  const selectCat = (cat) => {
    setActive(cat);
    setMatrixOpen(false);
    setDrawerOpen(false);
  };

  const openMatrix = () => {
    setMatrixOpen(true);
    setDrawerOpen(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout berhasil");
  };

  /* ---- profile / admin management ---- */
  const changePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password berhasil diganti");
      return true;
    } catch (err) {
      toast.error(err.message || "Gagal mengganti password");
      return false;
    }
  };

  const approveAdmin = async (a) => {
    const { error } = await supabase.from("admins").update({ status: "approved" }).eq("id", a.id);
    if (error) { toast.error(error.message || "Gagal menyetujui"); return; }
    toast.success(`${a.email} disetujui sebagai admin`);
    fetchAdmins();
  };

  const rejectAdmin = async (a) => {
    const { error } = await supabase.from("admins").update({ status: "rejected" }).eq("id", a.id);
    if (error) { toast.error(error.message || "Gagal menolak"); return; }
    toast.success(`${a.email} ditolak`);
    fetchAdmins();
  };

  const removeAdmin = async (a) => {
    const { error } = await supabase.from("admins").delete().eq("id", a.id);
    if (error) { toast.error(error.message || "Gagal menghapus akses"); return; }
    toast.success(`Akses ${a.email} dihapus`);
    fetchAdmins();
  };

  const toggleAiAccess = async (a) => {
    const next = !a.ai_access;
    const { error } = await supabase.from("admins").update({ ai_access: next }).eq("id", a.id);
    if (error) { toast.error(error.message || "Gagal mengubah akses AI"); return; }
    toast.success(`Matriks.ai ${next ? "diaktifkan" : "dinonaktifkan"} untuk ${a.email}`);
    fetchAdmins();
  };

  const handleLoginSuccess = async () => {
    setLoginOpen(false);
    await fetchAdmins();
  };

  const sidebarProps = {
    categories,
    active,
    onSelect: selectCat,
    counts,
    search,
    setSearch,
    isAdmin,
    canUseAI,
    matrixOpen,
    onOpenMatrix: openMatrix,
    onNewCategory: () => setCatModalOpen(true),
    onClose: () => setDrawerOpen(false),
    userEmail: session?.user?.email,
    onLogout: logout,
    onRenameCategory: (cat) => setRenameTarget(cat),
    onDeleteCategory: (cat) => setCatDeleteTarget(cat),
  };

  return (
    <>
      {matrixOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <MatriksAIFullscreen
            theme={theme}
            setTheme={setTheme}
            onClose={() => setMatrixOpen(false)}
            session={session}
          />
        </div>
      )}

      <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-border md:block">
        <Sidebar {...sidebarProps} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border shadow-2xl animate-slide-in-left">
            <Sidebar {...sidebarProps} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 ${matrixOpen ? "hidden" : ""}`}>
          <button
            data-testid="drawer-toggle-btn"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Search — most prominent */}
          <div className="relative flex-1 max-w-2xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              data-testid="global-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jawaban… (Ctrl+K)"
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-3 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              data-testid="theme-toggle-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg border border-input p-2.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Login / avatar — small circular icon */}
            <button
              data-testid="login-toggle-btn"
              onClick={() => (isAdmin ? setProfileOpen(true) : setLoginOpen(true))}
              title={isAdmin ? `${userEmail} (${isOwner ? "Owner" : "Admin"})` : "Login / Daftar"}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-150 ${
                isAdmin
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAdmin ? (
                (userEmail || "A")[0].toUpperCase()
              ) : (
                <Lock size={16} />
              )}
              {isOwner && pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6 ${matrixOpen ? "hidden" : ""}`}>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold tracking-wide sm:text-2xl">{active}</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Pencil size={12} />
                Mode edit
              </span>
            )}
            {active === "All" && (
              <span
                data-testid="all-info-tooltip"
                title="“All” menampilkan semua jawaban kecuali Archive."
                className="inline-flex cursor-help text-muted-foreground"
              >
                <Info size={15} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownUp size={15} className="text-muted-foreground" />
            <div className="flex flex-wrap rounded-lg border border-input bg-card p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  data-testid={`sort-${s.id}`}
                  onClick={() => setSort(s.id)}
                  className={`rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition-colors duration-150 ${
                    sort === s.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="vault-scroll h-full overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div
              data-testid="loading-state"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="mt-4 font-sans text-sm text-muted-foreground">Memuat jawaban…</p>
            </div>
          ) : visible.length === 0 ? (
            <div
              data-testid="empty-state"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <KeyRound size={28} />
              </div>
              <h3 className="mt-5 font-sans text-lg font-semibold">
                {search ? "Tidak ditemukan" : `Belum ada jawaban di ${active}`}
              </h3>
              <p className="mt-1.5 max-w-sm font-serif text-[15px] text-muted-foreground">
                {search
                  ? "Coba kata kunci lain, atau hapus pencarian."
                  : "Tambahkan jawaban pertama untuk mulai membangun bank jawaban."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onOpen={openDetail}
                  onOpenImage={openImage}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onCopy={requestCopy}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>

      {/* FAB — admin only */}
      {isAdmin && (
        <button
          data-testid="fab-add-btn"
          onClick={openNew}
          className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-sans text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-150 hover:opacity-90"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Tambah Jawaban</span>
        </button>
      )}

      <ItemModal
        open={modalOpen}
        draft={draft}
        categories={categories}
        userId={userId}
        onClose={() => setModalOpen(false)}
        onSave={saveItem}
      />
      <DetailModal
        item={detailItem}
        isAdmin={isAdmin}
        onClose={() => setDetailItem(null)}
        onEdit={openEdit}
        onDelete={(item) => {
          setDetailItem(null);
          setToDelete(item);
        }}
        onCopy={requestCopy}
        onOpenImage={openImage}
      />
      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <VariableFillModal
        target={copyTarget}
        onClose={() => setCopyTarget(null)}
        onConfirm={confirmVariableCopy}
      />
      <NewCategoryModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onCreate={createCategory}
      />
      <RenameCategoryModal
        open={!!renameTarget}
        current={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={renameCategory}
      />
      <ConfirmCategoryDelete
        name={catDeleteTarget}
        onCancel={() => setCatDeleteTarget(null)}
        onConfirm={deleteCategory}
      />
      <ConfirmDelete
        item={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        session={session}
        isAdmin={isAdmin}
        isOwner={isOwner}
        myRole={myRecord?.role}
        myStatus={myRecord?.status}
        admins={admins}
        pendingCount={pendingCount}
        onChangePassword={changePassword}
        onApproveAdmin={approveAdmin}
        onRejectAdmin={rejectAdmin}
        onRemoveAdmin={removeAdmin}
        onToggleAiAccess={toggleAiAccess}
      />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  App root — NO auth gate                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [theme, setTheme] = useState(() => load(THEME_KEY, "dark"));

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!hasSupabaseConfig) return <ConfigError />;

  return (
    <>
      <Toaster position="top-center" richColors theme={theme} />
      {session === undefined ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <Dashboard session={session} theme={theme} setTheme={setTheme} />
      )}
    </>
  );
}

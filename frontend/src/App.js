import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase, hasSupabaseConfig, isAdminEmail } from "@/lib/supabaseClient";
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

  const onCopy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let finalText = text;
      if (onBeforeCopy) {
        const r = await onBeforeCopy();
        if (r === null || r === undefined) return;
        finalText = r;
      }
      await writeClipboard(finalText);
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

/* ------------------------------------------------------------------ */
/*  Item card (compact / dense)                                        */
/* ------------------------------------------------------------------ */

const ItemCard = ({ item, isAdmin, onOpen, onEdit, onDelete, onCopy, onToggleFav }) => {
  const accent = accentFor(item.category);
  const vars = extractVars(item.content);

  return (
    <div
      data-testid={`item-card-${item.id}`}
      style={{
        borderColor: isAdmin ? accent.ring : undefined,
        boxShadow: isAdmin ? `inset 0 0 0 1px ${accent.ring}` : undefined,
      }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onOpen(item)}
          className="min-w-0 flex-1 text-left"
          data-testid={`item-title-${item.id}`}
        >
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-card-foreground line-clamp-2 hover:text-primary">
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
            <span className="rounded-lg p-1.5 text-muted-foreground" title="Ada gambar">
              <ImageIcon size={15} />
            </span>
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

  const onPickFile = (file) => {
    if (!validateFile(file)) return;
    setForm((f) => ({ ...f, image_file: file, image_url: URL.createObjectURL(file) }));
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
/*  Detail modal                                                       */
/* ------------------------------------------------------------------ */

const DetailModal = ({ item, isAdmin, onClose, onEdit, onDelete, onCopy }) => {
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
              className="max-h-72 w-full object-cover"
            />
          )}

          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 data-testid="detail-title" className="font-sans text-xl font-bold leading-snug">
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
/*  Login modal                                                        */
/* ------------------------------------------------------------------ */

const LoginModal = ({ open, onClose, onSuccess }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setBusy(false); setMode("login"); }
  }, [open]);

  if (!open) return null;

  const googleLogin = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // OAuth redirects the page; no further action here.
    } catch (err) {
      toast.error(err.message || "Login Google gagal");
      setBusy(false);
    }
  };

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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Cek email untuk konfirmasi akun");
        } else {
          toast.success("Akun dibuat");
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
          <h2 className="font-sans text-lg font-semibold">Login Admin</h2>
          <button
            data-testid="login-close-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <button
          data-testid="google-login-btn"
          onClick={googleLogin}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input px-4 py-2.5 font-sans text-sm font-semibold transition-colors duration-150 hover:bg-secondary disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Masuk dengan Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-sans text-xs text-muted-foreground">atau</span>
          <div className="h-px flex-1 bg-border" />
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
            autoComplete="current-password"
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
            <p className="font-sans text-[15px] font-bold leading-tight">{APP_TITLE}</p>
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
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

const Dashboard = ({ session, theme, setTheme }) => {
  const isAdmin = Boolean(session && isAdminEmail(session.user?.email));
  const userId = session?.user?.id || null;

  const [items, setItems] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft("All"));
  const [detailItem, setDetailItem] = useState(null);
  const [copyTarget, setCopyTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const searchRef = useRef(null);

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

  const incrementUsage = useCallback(async (id) => {
    try {
      await supabase.rpc("increment_usage_count", { target_id: id });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, usage_count: (i.usage_count || 0) + 1 } : i))
      );
    } catch {
      /* non-fatal — counter only */
    }
  }, []);

  /* Copy: resolve variables, then increment usage + return text */
  const requestCopy = useCallback(
    async (item) => {
      const vars = extractVars(item.content);
      if (vars.length > 0) {
        setCopyTarget({ item, vars });
        return null; // modal handles the copy
      }
      await incrementUsage(item.id);
      return item.content;
    },
    [incrementUsage]
  );

  const confirmVariableCopy = useCallback(
    async (values) => {
      if (!copyTarget) return;
      const text = fillVars(copyTarget.item.content, values);
      await writeClipboard(text);
      await incrementUsage(copyTarget.item.id);
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
      setCustomCats((prev) => prev.filter((c) => c.id !== row.id));
    }
    setItems((prev) => prev.map((i) => (i.category === name ? { ...i, category: "Archive" } : i)));
    if (active === name) setActive("All");
    toast.success("Topik dihapus — jawaban dipindah ke Archive");
  };

  const selectCat = (cat) => {
    setActive(cat);
    setDrawerOpen(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout berhasil");
  };

  const sidebarProps = {
    categories,
    active,
    onSelect: selectCat,
    counts,
    search,
    setSearch,
    isAdmin,
    onNewCategory: () => setCatModalOpen(true),
    onClose: () => setDrawerOpen(false),
    userEmail: session?.user?.email,
    onLogout: logout,
    onRenameCategory: (cat) => setRenameTarget(cat),
    onDeleteCategory: (cat) => setCatDeleteTarget(cat),
  };

  return (
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
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
              onClick={() => (isAdmin ? logout() : setLoginOpen(true))}
              title={isAdmin ? `${session.user.email} (admin)` : "Login admin"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-150 ${
                isAdmin
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAdmin ? (
                (session.user.email || "A")[0].toUpperCase()
              ) : (
                <Lock size={16} />
              )}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-lg font-bold sm:text-xl">{active}</h1>
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

        <main className="vault-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-6">
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
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onCopy={requestCopy}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )}
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
      />
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
        onSuccess={() => setLoginOpen(false)}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  App root — NO auth gate                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [theme, setTheme] = useState(() => load(THEME_KEY, "light"));

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

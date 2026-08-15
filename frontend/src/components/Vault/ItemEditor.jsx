import React, { useState, useEffect, useRef } from "react";
import { X, Tag, Save, Sparkles, ImagePlus, Trash2, Loader2 } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { Modal } from "../UI/Modal";
import { PasswordGenerator } from "./PasswordGenerator";
import { ITEM_TEMPLATES } from "../../lib/constants";
import { validateItem } from "../../utils/validators";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ItemEditor = ({ isOpen, onClose, onSave, item = null, categories = [] }) => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Notes",
    tags: [],
    favorite: false,
    image_url: null,
    image_file: null,
    image_removed: false,
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [showGenerator, setShowGenerator] = useState(false);
  const [template, setTemplate] = useState(null);
  const [imageError, setImageError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title || "",
        content: item.content || "",
        category: item.category || "Notes",
        tags: item.tags || [],
        favorite: item.favorite || false,
        image_url: item.image_url || null,
        image_file: null,
        image_removed: false,
      });
      setTemplate(null);
      setImageError("");
    } else {
      setForm({
        title: "",
        content: "",
        category: "Notes",
        tags: [],
        favorite: false,
        image_url: null,
        image_file: null,
        image_removed: false,
      });
      setErrors({});
      setTemplate(null);
      setImageError("");
    }
  }, [item, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Pilih file gambar (jpg, png, webp, gif).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Gambar maksimal 5MB.");
      return;
    }
    setImageError("");
    setForm((prev) => ({
      ...prev,
      image_file: file,
      image_url: URL.createObjectURL(file),
      image_removed: false,
    }));
    e.target.value = "";
  };

  const onRemoveImage = () => {
    setForm((prev) => ({
      ...prev,
      image_file: null,
      image_url: null,
      image_removed: true,
    }));
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = () => {
    const validation = validateItem(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    onSave(item?.id, form);
    onClose();
  };

  const applyTemplate = (type) => {
    setTemplate(type);
    const t = ITEM_TEMPLATES[type];
    if (t) {
      setForm((prev) => ({
        ...prev,
        category: t.label,
        content: t.fields.map((f) => `${f.label}:\n`).join("\n"),
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Edit Item" : "Item Baru"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-1.5" />
            {item ? "Simpan Perubahan" : "Buat Item"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!item && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(ITEM_TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  template === key
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        <Input
          label="Judul"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Contoh: Password Netflix"
          error={errors.title}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
          >
            {categories.map((cat) => (
              <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
            ))}
            <option value="Notes">Notes</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Konten</label>
            <button
              type="button"
              onClick={() => setShowGenerator(!showGenerator)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {showGenerator ? "Sembunyikan Generator" : "Generator Password"}
            </button>
          </div>

          {showGenerator && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <PasswordGenerator onSelect={(pwd) => handleChange("content", form.content + (form.content ? "\n" : "") + `Password: ${pwd}`)} />
            </div>
          )}

          <textarea
            value={form.content}
            onChange={(e) => handleChange("content", e.target.value)}
            placeholder="Simpan informasi di sini..."
            rows={6}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800 resize-y"
          />
          {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Gambar <span className="font-normal text-slate-400">(opsional, max 5MB)</span>
          </label>

          {form.image_url ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <img
                src={form.image_url}
                alt="Preview"
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {form.image_file?.name || "Gambar saat ini"}
                </span>
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-7 text-center transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-800/50"
            >
              <ImagePlus className="h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Klik untuk upload gambar
              </p>
              <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP, GIF · max 5MB</p>
            </button>
          )}

          {imageError && (
            <p className="mt-2 text-xs font-medium text-red-500">{imageError}</p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tag</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Ketik tag lalu tekan Enter..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.favorite}
            onChange={(e) => handleChange("favorite", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">Tandai sebagai favorit</span>
        </label>
      </div>
    </Modal>
  );
};

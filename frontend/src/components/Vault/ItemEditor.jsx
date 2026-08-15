import React, { useState, useEffect } from "react";
import { X, Tag, Save, Sparkles } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { Modal } from "../UI/Modal";
import { PasswordGenerator } from "./PasswordGenerator";
import { ITEM_TEMPLATES } from "../../lib/constants";
import { validateItem } from "../../utils/validators";

export const ItemEditor = ({ isOpen, onClose, onSave, item = null, categories = [] }) => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Notes",
    tags: [],
    favorite: false,
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [showGenerator, setShowGenerator] = useState(false);
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title || "",
        content: item.content || "",
        category: item.category || "Notes",
        tags: item.tags || [],
        favorite: item.favorite || false,
      });
      setTemplate(null);
    } else {
      setForm({ title: "", content: "", category: "Notes", tags: [], favorite: false });
      setErrors({});
      setTemplate(null);
    }
  }, [item, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
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

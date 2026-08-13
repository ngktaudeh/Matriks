import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
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
  KeyRound,
  StickyNote,
  Link2,
  Archive,
  Folder,
  Vault,
  ArrowDownUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const THEME_KEY = "vault-theme";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Categories that are real buckets an item can live in.
const BUILTIN_CATEGORIES = ["Credentials", "Notes", "Links", "Archive"];

const CATEGORY_ICONS = {
  All: Layers,
  Favorites: Star,
  Credentials: KeyRound,
  Notes: StickyNote,
  Links: Link2,
  Archive: Archive,
};

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "az", label: "A–Z" },
  { id: "fav", label: "Favorites first" },
];

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
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

const CopyButton = ({ text, testid }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      data-testid={testid}
      onClick={onCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
        copied
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

const ItemCard = ({ item, onEdit, onDelete, onToggleFav }) => (
  <div
    data-testid={`item-card-${item.id}`}
    className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <h3
        data-testid={`item-title-${item.id}`}
        className="font-sans text-base font-semibold leading-snug text-card-foreground line-clamp-2"
      >
        {item.title}
      </h3>
      <button
        data-testid={`favorite-toggle-${item.id}`}
        onClick={() => onToggleFav(item.id)}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary"
        aria-label="Toggle favorite"
      >
        <Star
          size={18}
          className={
            item.favorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground"
          }
        />
      </button>
    </div>

    <p className="mt-2 flex-1 whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-muted-foreground line-clamp-4">
      {item.content}
    </p>

    {item.tags?.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
    )}

    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {item.category}
      </span>
      <div className="flex items-center gap-0.5">
        <CopyButton text={item.content} testid={`copy-btn-${item.id}`} />
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
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Edit / Create modal                                                */
/* ------------------------------------------------------------------ */

const emptyDraft = (category) => ({
  id: null,
  title: "",
  content: "",
  tags: [],
  category: category && !["All", "Favorites"].includes(category)
    ? category
    : "Notes",
  favorite: false,
});

const ItemModal = ({ open, draft, categories, onClose, onSave }) => {
  const [form, setForm] = useState(draft);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      setForm(draft);
      setTagInput((draft.tags || []).join(", "));
    }
  }, [open, draft]);

  if (!open) return null;

  const save = () => {
    if (!form.title.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
    onSave({ ...form, title: form.title.trim(), tags });
  };

  const catOptions = categories.filter(
    (c) => !["All", "Favorites"].includes(c)
  );

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
            {form.id ? "Edit item" : "New item"}
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
            <label className="mb-1.5 block font-sans text-sm font-medium">
              Title
            </label>
            <input
              data-testid="modal-title-input"
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Production API key"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-sm font-medium">
              Content
            </label>
            <textarea
              data-testid="modal-content-input"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              placeholder="Paste anything — a password, a note, a link, a snippet…"
              className="vault-scroll w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 font-serif text-[15px] leading-relaxed outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-sans text-sm font-medium">
                Category
              </label>
              <select
                data-testid="modal-category-select"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
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
                Tags{" "}
                <span className="font-normal text-muted-foreground">
                  (comma separated)
                </span>
              </label>
              <input
                data-testid="modal-tags-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="prod, db, secret"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <button
            data-testid="modal-favorite-toggle"
            onClick={() => setForm({ ...form, favorite: !form.favorite })}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-sans text-sm font-medium transition-colors duration-150 ${
              form.favorite
                ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                : "border-input text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Star
              size={16}
              className={form.favorite ? "fill-amber-400 text-amber-400" : ""}
            />
            {form.favorite ? "Favorited" : "Mark as favorite"}
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            data-testid="modal-cancel-btn"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            data-testid="modal-save-btn"
            onClick={save}
            disabled={!form.title.trim()}
            className="rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {form.id ? "Save changes" : "Create item"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Delete confirm                                                     */
/* ------------------------------------------------------------------ */

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
        <h3 className="font-sans text-lg font-semibold">Delete item?</h3>
        <p className="mt-2 font-serif text-[15px] text-muted-foreground">
          “{item.title}” will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            data-testid="delete-cancel-btn"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            data-testid="delete-confirm-btn"
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground transition-all duration-150 hover:opacity-90"
          >
            Delete
          </button>
        </div>
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
  onNewCategory,
  onClose,
}) => (
  <div className="flex h-full flex-col bg-card">
    <div className="flex items-center justify-between px-5 pb-4 pt-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Vault size={19} />
        </div>
        <div>
          <p className="font-sans text-[15px] font-bold leading-tight">
            Knowledge Vault
          </p>
          <p className="font-sans text-[11px] text-muted-foreground">
            {counts.total} items stored
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

    <div className="px-4 pb-4">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          data-testid="sidebar-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Quick search…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>
    </div>

    <nav className="vault-scroll flex-1 space-y-0.5 overflow-y-auto px-3">
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat] || Folder;
        const isActive = active === cat;
        return (
          <button
            key={cat}
            data-testid={`category-${cat.toLowerCase()}`}
            onClick={() => onSelect(cat)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon size={16} />
              {cat}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {counts[cat] ?? 0}
            </span>
          </button>
        );
      })}
    </nav>

    <div className="border-t border-border p-3">
      <button
        data-testid="new-category-btn"
        onClick={onNewCategory}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
      >
        <Plus size={16} />
        New Category
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [items, setItems] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [theme, setTheme] = useState(() => load(THEME_KEY, "light"));
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft("Notes"));
  const [toDelete, setToDelete] = useState(null);

  /* ---- initial load from server ---- */
  useEffect(() => {
    (async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          axios.get(`${API}/items`),
          axios.get(`${API}/categories`),
        ]);
        setItems(itemsRes.data);
        setCustomCats(catsRes.data);
      } catch (e) {
        console.error("Failed to load vault", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- theme is a per-browser preference ---- */
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  /* ---- category list & counts ---- */
  const categories = useMemo(
    () => ["All", "Favorites", ...BUILTIN_CATEGORIES.slice(0, 3), ...customCats, "Archive"],
    [customCats]
  );

  const counts = useMemo(() => {
    const c = { total: items.length, All: 0, Favorites: 0 };
    for (const it of items) {
      if (it.category !== "Archive") c.All += 1;
      if (it.favorite) c.Favorites += 1;
      c[it.category] = (c[it.category] || 0) + 1;
    }
    return c;
  }, [items]);

  /* ---- filter + sort ---- */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((it) => {
      if (active === "All") return it.category !== "Archive";
      if (active === "Favorites") return it.favorite;
      return it.category === active;
    });

    if (q) {
      list = list.filter((it) => {
        const hay = `${it.title} ${it.content} ${(it.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (sort === "az")
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "fav")
      sorted.sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt
      );
    return sorted;
  }, [items, active, search, sort]);

  /* ---- handlers ---- */
  const openNew = () => {
    setDraft(emptyDraft(active));
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setDraft(item);
    setModalOpen(true);
  };
  const saveItem = async (form) => {
    try {
      if (form.id) {
        const { data } = await axios.put(`${API}/items/${form.id}`, {
          title: form.title,
          content: form.content,
          tags: form.tags,
          category: form.category,
          favorite: form.favorite,
        });
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
      } else {
        const { data } = await axios.post(`${API}/items`, {
          title: form.title,
          content: form.content,
          tags: form.tags,
          category: form.category,
          favorite: form.favorite,
        });
        setItems((prev) => [data, ...prev]);
      }
      setModalOpen(false);
    } catch (e) {
      console.error("Save failed", e);
    }
  };
  const toggleFav = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i))
    );
    try {
      await axios.put(`${API}/items/${id}`, { favorite: !item.favorite });
    } catch (e) {
      console.error("Toggle failed", e);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, favorite: item.favorite } : i))
      );
    }
  };
  const confirmDelete = async () => {
    const id = toDelete.id;
    setToDelete(null);
    try {
      await axios.delete(`${API}/items/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };
  const addCategory = async () => {
    const name = window.prompt("New category name")?.trim();
    if (!name) return;
    const reserved = categories.map((c) => c.toLowerCase());
    if (reserved.includes(name.toLowerCase())) {
      window.alert("That category already exists.");
      return;
    }
    try {
      const { data } = await axios.post(`${API}/categories`, { name });
      setCustomCats(data);
      setActive(name);
      setDrawerOpen(false);
    } catch (e) {
      console.error("Add category failed", e);
    }
  };

  const selectCat = (cat) => {
    setActive(cat);
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-72 shrink-0 border-r border-border md:block">
        <Sidebar
          categories={categories}
          active={active}
          onSelect={selectCat}
          counts={counts}
          search={search}
          setSearch={setSearch}
          onNewCategory={addCategory}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      {/* ---- Mobile drawer ---- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border shadow-2xl animate-slide-in-left">
            <Sidebar
              categories={categories}
              active={active}
              onSelect={selectCat}
              counts={counts}
              search={search}
              setSearch={setSearch}
              onNewCategory={addCategory}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            data-testid="drawer-toggle-btn"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 max-w-xl">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              data-testid="global-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, content, tags…"
              className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-3 font-sans text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              data-testid="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="rounded-lg border border-input p-2.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              data-testid="add-item-btn"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-sans text-xl font-bold sm:text-2xl">{active}</h1>
            <p className="font-sans text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? "item" : "items"}
              {search && " · filtered"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownUp size={15} className="text-muted-foreground" />
            <div className="flex rounded-lg border border-input bg-card p-0.5">
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

        {/* Grid */}
        <main className="vault-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div
              data-testid="loading-state"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              <p className="mt-4 font-sans text-sm text-muted-foreground">
                Loading your vault…
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div
              data-testid="empty-state"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Vault size={28} />
              </div>
              <h3 className="mt-5 font-sans text-lg font-semibold">
                {search
                  ? "No matches found"
                  : `Nothing in ${active} yet`}
              </h3>
              <p className="mt-1.5 max-w-sm font-serif text-[15px] text-muted-foreground">
                {search
                  ? "Try a different keyword, or clear the search to see everything."
                  : "Add your first item to start building your vault of copy-ready knowledge."}
              </p>
              {!search && (
                <button
                  data-testid="empty-add-btn"
                  onClick={openNew}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <ItemModal
        open={modalOpen}
        draft={draft}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSave={saveItem}
      />
      <ConfirmDelete
        item={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

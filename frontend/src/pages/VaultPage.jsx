import React, { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Plus, MessageSquare, Trash2, Download, Upload } from "lucide-react";
import { Header } from "../components/Layout/Header";
import { Sidebar } from "../components/Layout/Sidebar";
import { MobileDrawer } from "../components/Layout/MobileDrawer";
import { SearchBar } from "../components/Vault/SearchBar";
import { SortDropdown } from "../components/Vault/SortDropdown";
import { ItemList } from "../components/Vault/ItemList";
import { ItemEditor } from "../components/Vault/ItemEditor";
import { ImageLightbox } from "../components/Vault/ImageLightbox";
import { CategoryManager } from "../components/Vault/CategoryManager";
import { BulkActionsBar } from "../components/Vault/BulkActionsBar";
import { ChatPanel } from "../components/AI/ChatPanel";
import { Button } from "../components/UI/Button";
import { useAuth } from "../hooks/useAuth";
import { useItems } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useDebounce } from "../hooks/useDebounce";
import { useClipboard } from "../hooks/useClipboard";
import { useRealtime } from "../hooks/useRealtime";
import { highlightMatch } from "../utils/formatters";

export const VaultPage = () => {
  const { user, signOut } = useAuth();
  const { items, loading, fetchItems, addItem, updateItem, toggleFavorite, moveToTrash, bulkMoveToTrash } = useItems(user?.id);
  const { categories, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategories(user?.id);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [activeCategory, setActiveCategory] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const debouncedSearch = useDebounce(search, 300);
  const { copy } = useClipboard();

  // Realtime sync: refetch data saat ada perubahan di Supabase (antar tab/perangkat).
  useRealtime("items", () => {
    fetchItems();
  });
  useRealtime("categories", () => {
    fetchCategories();
  });

  // Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (activeCategory === "favorites") {
      result = result.filter((i) => i.favorite);
    } else if (activeCategory) {
      result = result.filter((i) => i.category === activeCategory);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.content?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "favorites":
        result.sort((a, b) => (b.favorite === a.favorite ? 0 : b.favorite ? 1 : -1));
        break;
      case "updated":
        result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return result;
  }, [items, activeCategory, debouncedSearch, sortBy]);

  const itemCounts = useMemo(() => {
    const counts = { all: items.length };
    items.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const favoritesCount = useMemo(() => items.filter((i) => i.favorite).length, [items]);

  const handleCopy = useCallback(
    async (text) => {
      const ok = await copy(text);
      if (ok) toast.success("Disalin ke clipboard");
      return ok;
    },
    [copy]
  );

  const handleSaveItem = async (id, data) => {
    if (id) {
      await updateItem(id, data);
      toast.success("Item diperbarui");
    } else {
      await addItem(data);
      toast.success("Item dibuat");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus item ini? Item akan dipindahkan ke tempat sampah.")) return;
    await moveToTrash(id);
    toast.success("Item dipindahkan ke tempat sampah");
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.length} item?`)) return;
    await bulkMoveToTrash(selectedIds);
    setSelectedIds([]);
    setSelectionMode(false);
    toast.success(`${selectedIds.length} item dipindahkan ke tempat sampah`);
  };

  const handleExport = () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matriks-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export berhasil");
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("Format tidak valid");
        for (const item of data) {
          await addItem({
            title: item.title,
            content: item.content,
            category: item.category || "Notes",
            tags: item.tags || [],
            favorite: item.favorite || false,
          });
        }
        toast.success(`Berhasil mengimpor ${data.length} item`);
      } catch (err) {
        toast.error("Gagal mengimpor: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      <Header onMenuClick={() => setMobileMenuOpen(true)} user={user} onLogout={signOut} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              setSelectedIds([]);
            }}
            onAddCategory={() => setShowCategoryManager(true)}
            onOpenTrash={() => window.location.href = "/trash"}
            onOpenSettings={() => toast.info("Pengaturan akan datang segera")}
            onLogout={signOut}
            loading={false}
            itemCounts={itemCounts}
            favoritesCount={favoritesCount}
            trashCount={0}
          />
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
          <Sidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              setMobileMenuOpen(false);
              setSelectedIds([]);
            }}
            onAddCategory={() => {
              setShowCategoryManager(true);
              setMobileMenuOpen(false);
            }}
            onOpenTrash={() => { window.location.href = "/trash"; setMobileMenuOpen(false); }}
            onOpenSettings={() => toast.info("Pengaturan akan datang segera")}
            onLogout={signOut}
            loading={false}
            itemCounts={itemCounts}
            favoritesCount={favoritesCount}
            trashCount={0}
          />
        </MobileDrawer>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
            <SearchBar value={search} onChange={setSearch} />
            <div className="flex items-center gap-2">
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <Button
                variant={selectionMode ? "primary" : "ghost"}
                size="icon"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedIds([]);
                }}
                className="hidden sm:flex"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                <Button variant="ghost" size="icon" as="span">
                  <Upload className="h-4 w-4" />
                </Button>
              </label>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={() => { setEditingItem(null); setShowEditor(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Baru</span>
              </Button>
            </div>
          </div>

          <div className="p-4">
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onDelete={handleBulkDelete}
              onFavorite={async () => {
                for (const id of selectedIds) {
                  const item = items.find((i) => i.id === id);
                  if (item) await toggleFavorite(id, item.favorite);
                }
                setSelectedIds([]);
                toast.success("Favorit diperbarui");
              }}
              view="active"
            />

            <ItemList
              items={filteredItems}
              loading={loading}
              searchQuery={debouncedSearch}
              onEdit={(item) => { setEditingItem(item); setShowEditor(true); }}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
              onCopy={handleCopy}
              onOpenImage={(url) => setLightboxUrl(url)}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              selectionMode={selectionMode}
              view="active"
            />
          </div>
        </main>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 dark:bg-white dark:text-slate-900"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        vaultContext={`User memiliki ${items.length} item di vault.`}
      />

      <ItemEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
      />

      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />
    </div>
  );
};

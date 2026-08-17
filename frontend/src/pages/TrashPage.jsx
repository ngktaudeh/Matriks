import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2, ArchiveRestore, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useItems } from "../hooks/useItems";
import { Header } from "../components/Layout/Header";
import { ItemCard } from "../components/Vault/ItemCard";
import { ItemCardSkeleton } from "../components/UI/Skeleton";
import { EmptyState } from "../components/Vault/EmptyState";
import { BulkActionsBar } from "../components/Vault/BulkActionsBar";
import { Button } from "../components/UI/Button";
import { useClipboard } from "../hooks/useClipboard";

export const TrashPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { items, loading, restoreItem, permanentDelete, bulkDelete } = useItems(user?.id, "trash");
  const { copy } = useClipboard();

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const handleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleRestore = async (id) => {
    await restoreItem(id);
    toast.success("Item dipulihkan");
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("PERMANEN: Item ini akan dihapus selamanya. Lanjutkan?")) return;
    await permanentDelete(id);
    toast.success("Item dihapus permanen");
  };

  const handleBulkRestore = async () => {
    for (const id of selectedIds) await restoreItem(id);
    setSelectedIds([]);
    setSelectionMode(false);
    toast.success("Item dipulihkan");
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`PERMANEN: Hapus ${selectedIds.length} item selamanya?`)) return;
    await bulkDelete(selectedIds);
    setSelectedIds([]);
    setSelectionMode(false);
    toast.success("Item dihapus permanen");
  };

  const handleCopy = async (text) => {
    const ok = await copy(text);
    if (ok) toast.success("Disalin");
    return ok;
  };

  return (
    <div className="flex h-screen flex-col bg-[#09090d]">
      <Header user={user} onLogout={signOut} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-[rgba(255,42,95,0.2)] bg-[#0a0a0e]/80 px-4 py-3 backdrop-blur-md">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali
            </Button>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <h1 className="text-lg font-semibold text-white">Tempat Sampah</h1>
            </div>
            <span className="ml-auto text-xs text-white/50">
              Item dihapus permanen otomatis setelah 30 hari
            </span>
          </div>

          <div className="p-4">
            {items.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Item di tempat sampah akan dihapus permanen setelah 30 hari.</span>
                </div>
              </div>
            )}

            <BulkActionsBar
              selectedCount={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onDelete={handleBulkDelete}
              onRestore={handleBulkRestore}
              view="trash"
            />

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <ItemCardSkeleton key={i} />)}
              </div>
            ) : items.length === 0 ? (
              <EmptyState type="trash" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div key={item.id} className="relative">
                    {selectionMode && (
                      <div className="absolute left-3 top-3 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelect(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                      </div>
                    )}
                    <ItemCard
                      item={item}
                      onEdit={() => {}}
                      onDelete={() => handlePermanentDelete(item.id)}
                      onToggleFavorite={() => {}}
                      onCopy={handleCopy}
                      isSelected={selectedIds.includes(item.id)}
                      onSelect={handleSelect}
                      selectionMode={selectionMode}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleRestore(item.id)}>
                        <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                        Pulihkan
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1" onClick={() => handlePermanentDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Hapus Permanen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

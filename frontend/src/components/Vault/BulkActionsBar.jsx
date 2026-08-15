import React from "react";
import { X, Trash2, Heart, ArchiveRestore } from "lucide-react";
import { Button } from "../UI/Button";

export const BulkActionsBar = ({
  selectedCount,
  onClear,
  onDelete,
  onFavorite,
  onRestore,
  view,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-16 z-20 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {selectedCount} item dipilih
        </span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" />
          Batal
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {view === "trash" ? (
          <Button variant="secondary" size="sm" onClick={onRestore}>
            <ArchiveRestore className="w-4 h-4 mr-1" />
            Pulihkan
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onFavorite}>
              <Heart className="w-4 h-4 mr-1" />
              Favorit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Hapus
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

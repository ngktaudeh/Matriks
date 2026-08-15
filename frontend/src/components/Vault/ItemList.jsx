import React, { useState } from "react";
import { X } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { ItemCardSkeleton } from "../UI/Skeleton";
import { EmptyState } from "./EmptyState";

export const ItemList = ({
  items,
  loading,
  searchQuery,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
  selectedIds,
  onSelect,
  selectionMode,
  view,
}) => {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        type={view === "trash" ? "trash" : searchQuery ? "search" : "empty"}
        query={searchQuery}
        onClearSearch={() => {}}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onCopy={onCopy}
            isSelected={selectedIds.includes(item.id)}
            onSelect={onSelect}
            selectionMode={selectionMode}
            onImageClick={setLightboxImage}
          />
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Full view"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

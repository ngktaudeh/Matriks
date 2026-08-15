import React from "react";
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
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        />
      ))}
    </div>
  );
};

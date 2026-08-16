import React from "react";
import { Trash2, Star, LayoutGrid, Plus, Settings, LogOut } from "lucide-react";
import { Button } from "../UI/Button";
import { Tooltip } from "../UI/Tooltip";
import { SidebarSkeleton } from "../UI/Skeleton";

export const Sidebar = ({
  categories,
  activeCategory,
  onCategoryChange,
  onAddCategory,
  onOpenTrash,
  onOpenSettings,
  onLogout,
  loading,
  itemCounts,
  favoritesCount,
  trashCount,
}) => {
  const navItems = [
    { id: "all", label: "Semua Item", icon: LayoutGrid, count: itemCounts?.all || 0 },
    { id: "favorites", label: "Favorit", icon: Star, count: favoritesCount || 0 },
    { id: "trash", label: "Tempat Sampah", icon: Trash2, count: trashCount || 0 },
  ];

  const isActive = (item) =>
    activeCategory === item.id || (item.id === "all" && !activeCategory);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-black/25 backdrop-blur-xl">
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                item.id === "trash"
                  ? onOpenTrash()
                  : onCategoryChange(
                      item.id === "all" ? null : item.id === "favorites" ? "favorites" : item.id
                    )
              }
              className={`
                flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium
                transition-all duration-200
                ${
                  isActive(item)
                    ? "bg-gradient-to-r from-purple-600/80 to-fuchsia-600/70 text-white shadow-lg shadow-purple-500/30"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive(item) ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Kategori
            </span>
            <Tooltip text="Tambah kategori">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddCategory}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>
          </div>

          {loading ? (
            <SidebarSkeleton />
          ) : (
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.name)}
                  className={`
                    flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm
                    transition-all duration-200
                    ${
                      activeCategory === cat.name
                        ? "bg-white/15 font-medium text-white"
                        : "text-white/45 hover:bg-white/8 hover:text-white/80"
                    }
                  `}
                >
                  <span className="truncate">{cat.name}</span>
                  {itemCounts?.[cat.name] > 0 && (
                    <span className="text-xs text-white/35">{itemCounts[cat.name]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/15"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

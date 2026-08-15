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

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === "trash" ? onOpenTrash() : onCategoryChange(item.id === "all" ? null : item.id === "favorites" ? "favorites" : item.id)}
              className={`
                flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium
                transition-all duration-200
                ${activeCategory === item.id || (item.id === "all" && !activeCategory)
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className={`text-xs rounded-full px-2 py-0.5 ${activeCategory === item.id ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kategori</span>
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
                    flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm
                    transition-all duration-200
                    ${activeCategory === cat.name
                      ? "bg-slate-200 text-slate-900 font-medium dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }
                  `}
                >
                  <span className="truncate">{cat.name}</span>
                  {itemCounts?.[cat.name] > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{itemCounts[cat.name]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-700">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

import React from "react";
import {
  Trash2,
  Star,
  LayoutGrid,
  Plus,
  Settings,
  LogOut,
  Highlighter,
  Sparkles,
  UserCircle,
  Home,
} from "lucide-react";
import { Button } from "../UI/Button";
import { Tooltip } from "../UI/Tooltip";
import { SidebarSkeleton } from "../UI/Skeleton";
import { APP_NAME } from "../../lib/constants";

export const Sidebar = ({
  categories,
  activeCategory,
  onCategoryChange,
  onAddCategory,
  onOpenTrash,
  onOpenSettings,
  onOpenHighlighter,
  onOpenPrediksi,
  onOpenProfile,
  onLogout,
  loading,
  itemCounts,
  favoritesCount,
  trashCount,
}) => {
  const navItems = [
    { id: "all", label: "Beranda", icon: Home, count: itemCounts?.all || 0 },
    { id: "favorites", label: "Favorit", icon: Star, count: favoritesCount || 0 },
    { id: "trash", label: "Tempat Sampah", icon: Trash2, count: trashCount || 0 },
  ];

  const isActive = (item) =>
    activeCategory === item.id || (item.id === "all" && !activeCategory);

  const menuLink =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 " +
    "text-white/55 hover:bg-[rgba(255,42,95,0.12)] hover:text-white hover:translate-x-1";

  const menuIconBox =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 " +
    "text-white/80 transition-all duration-200";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-[rgba(10,10,14,0.85)] backdrop-blur-xl">
      {/* Branding header */}
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(255,42,95,0.5)] bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-[0_0_20px_rgba(255,42,95,0.45)]">
            <Highlighter className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold leading-tight tracking-wide bg-gradient-to-r from-white via-[#ffb3c1] to-[#ff2a5f] bg-clip-text text-transparent">
              LINE TOGEL
            </h3>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff2a5f]">
              VIP Dashboard
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          Menu Utama
        </p>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const onClick =
              item.id === "trash"
                ? onOpenTrash
                : () =>
                    onCategoryChange(
                      item.id === "all" ? null : item.id === "favorites" ? "favorites" : item.id
                    );
            return (
              <button
                key={item.id}
                onClick={onClick}
                className={`
                  flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold
                  transition-all duration-200
                  ${
                    active
                      ? "bg-gradient-to-r from-[rgba(255,42,95,0.25)] to-[rgba(255,0,60,0.4)] text-white border border-[rgba(255,42,95,0.4)] shadow-[0_6px_18px_rgba(255,42,95,0.25)]"
                      : "text-white/55 hover:bg-[rgba(255,42,95,0.12)] hover:text-white hover:translate-x-1"
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <span className={menuIconBox + (active ? " !bg-[#ff2a5f] !text-white !border-[#ff2a5f]" : "")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      active ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <p className="mb-2 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          Alat & Fitur
        </p>
        <nav className="space-y-1.5">
          <button onClick={onOpenHighlighter} className={menuLink}>
            <span className={menuIconBox}>
              <Highlighter className="h-4 w-4" />
            </span>
            <span>Highlighter Suite</span>
          </button>
          <button onClick={onOpenPrediksi} className={menuLink}>
            <span className={menuIconBox}>
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Prediksi Togel</span>
          </button>
          <button onClick={onOpenProfile} className={menuLink}>
            <span className={menuIconBox}>
              <UserCircle className="h-4 w-4" />
            </span>
            <span>Profil</span>
          </button>
        </nav>

        <p className="mb-2 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          Kategori
        </p>
        <div className="mb-2 flex items-center justify-between px-3">
          <Tooltip text="Tambah kategori">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddCategory}>
              <Plus className="h-3.5 w-3.5" />
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
                      ? "bg-[rgba(255,42,95,0.15)] font-medium text-white border border-[rgba(255,42,95,0.3)]"
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

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.12)] px-3 py-1 text-[10px] font-bold text-[#00ff88]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
          Encrypted v2.0
        </div>
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#ff5c7a] transition-colors hover:bg-[#ff2a5f]/15"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
        <div className="mt-3 text-center text-[10px] text-white/40">© 2026 {APP_NAME} Dashboard</div>
      </div>
    </aside>
  );
};

import React from "react";
import { Menu, Shield, KeyRound } from "lucide-react";
import { Button } from "../UI/Button";
import { ThemeToggle } from "./ThemeToggle";
import { APP_NAME } from "../../lib/constants";

export const Header = ({ onMenuClick, user, onLogout, onOpenGenerator }) => (
  <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-4 backdrop-blur-xl">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Buka menu">
        <Menu className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-purple-500/40 glow-pulse">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          {APP_NAME}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {onOpenGenerator && (
        <Button variant="outline" size="sm" onClick={onOpenGenerator} aria-label="Generator" className="shimmer">
          <KeyRound className="w-4 h-4" />
          <span className="hidden sm:inline">Generator</span>
        </Button>
      )}
      <ThemeToggle />
      {user && (
        <div className="hidden sm:flex items-center gap-3">
          <span className="max-w-[160px] truncate text-sm text-white/60">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      )}
    </div>
  </header>
);

import React from "react";
import { Menu, Shield, KeyRound } from "lucide-react";
import { Button } from "../UI/Button";
import { ThemeToggle } from "./ThemeToggle";
import { APP_NAME } from "../../lib/constants";

export const Header = ({ onMenuClick, user, onLogout, onOpenGenerator }) => (
  <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Buka menu">
        <Menu className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
          <Shield className="h-5 w-5 text-white dark:text-slate-900" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{APP_NAME}</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {onOpenGenerator && (
        <Button variant="outline" size="sm" onClick={onOpenGenerator} aria-label="Generator">
          <KeyRound className="w-4 h-4" />
          <span className="hidden sm:inline">Generator</span>
        </Button>
      )}
      <ThemeToggle />
      {user && (
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      )}
    </div>
  </header>
);

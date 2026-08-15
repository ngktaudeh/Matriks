import React from "react";
import { Loader2 } from "lucide-react";

export const AuthGuard = ({ user, loading, children }) => {
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-white" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Parent akan redirect ke login
  }

  return <>{children}</>;
};

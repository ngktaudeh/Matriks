import React from "react";
import { Loader2 } from "lucide-react";

export const AuthGuard = ({ user, loading, children }) => {
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090d]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-white/50">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Parent akan redirect ke login
  }

  return <>{children}</>;
};

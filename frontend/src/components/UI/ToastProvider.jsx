import React from "react";
import { Toaster } from "sonner";

export const ToastProvider = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      className: "dark:bg-slate-800 dark:text-white dark:border-slate-700",
      duration: 3000,
    }}
    richColors
    closeButton
  />
);

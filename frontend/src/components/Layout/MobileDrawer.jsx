import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../UI/Button";

export const MobileDrawer = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-72 bg-[#0a0a0e] shadow-2xl transform transition-transform duration-300 ease-out animate-in slide-in-from-left border-r border-[rgba(255,42,95,0.3)]">
        <div className="flex items-center justify-end p-4">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup menu">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

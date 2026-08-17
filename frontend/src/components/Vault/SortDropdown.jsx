import React, { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { SORT_OPTIONS } from "../../lib/constants";

export const SortDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = SORT_OPTIONS.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="hidden sm:inline">{selected?.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-white/10 bg-[#0a0a0e] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                value === option.value
                  ? "bg-[rgba(255,42,95,0.18)] font-medium text-white"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              {option.label}
              {value === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

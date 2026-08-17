import React from "react";
import { Search, X, Command } from "lucide-react";

export const SearchBar = ({ value, onChange, placeholder = "Cari vault..." }) => {
  return (
    <div className="relative flex-1 max-w-xl">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/35 transition-all focus:border-[#ff2a5f] focus:outline-none focus:ring-2 focus:ring-[#ff2a5f]/30"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-white/35">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      )}
    </div>
  );
};

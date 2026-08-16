import React from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "btn-neon text-white border-0 focus:ring-purple-400",
  secondary:
    "glass text-white hover:bg-white/10 border border-white/15",
  danger:
    "bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/30 hover:brightness-110",
  ghost:
    "bg-transparent text-white/70 hover:bg-white/10 hover:text-white",
  outline:
    "border border-white/20 text-white/90 hover:bg-white/10 hover:border-purple-400/50",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  icon: "p-2",
};

export const Button = React.forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      loading = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 rounded-xl font-medium
          transition-all duration-200 ease-out
          active:scale-[0.97]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

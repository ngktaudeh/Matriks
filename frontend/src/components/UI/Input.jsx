import React from "react";

export const Input = React.forwardRef(
  ({ label, error, className = "", icon: Icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900
              placeholder:text-slate-400
              transition-colors duration-200
              focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200
              dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700
              dark:focus:border-slate-500 dark:focus:ring-slate-800
              ${Icon ? "pl-10" : ""}
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-slate-200"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

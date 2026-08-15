import React from "react";

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`} />
);

export const ItemCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const SidebarSkeleton = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-8 w-3/4" />
    <div className="space-y-2 mt-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

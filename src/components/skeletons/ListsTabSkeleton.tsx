import React from "react";

export function ListsTabSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3 animate-pulse">
          <div className="flex gap-2.5">
            <div className="w-[60px] h-[90px] bg-zinc-800 rounded" />
            <div className="w-[60px] h-[90px] bg-zinc-850 rounded" />
            <div className="w-[60px] h-[90px] bg-zinc-900 rounded" />
          </div>
          <div className="h-4.5 w-2/3 bg-zinc-800 rounded mt-2" />
          <div className="h-3 w-1/2 bg-zinc-850 rounded" />
        </div>
      ))}
    </div>
  );
}

import React from "react";

export function ListsTabSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full select-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-zinc-800/80 bg-zinc-900/20 rounded-xl p-3 flex flex-col justify-between h-28 animate-pulse">
          <div className="flex items-center pl-2 relative h-12">
            <div className="relative h-12 aspect-[2/3] rounded-md bg-zinc-800" />
            <div className="relative h-12 aspect-[2/3] rounded-md bg-zinc-850 -ml-2" />
            <div className="relative h-12 aspect-[2/3] rounded-md bg-zinc-900 -ml-2" />
            
            <div className="flex-1 pl-4 flex flex-col justify-center min-w-0 space-y-1.5">
              <div className="h-3 w-3/4 bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
            <div className="h-2.5 w-8 bg-zinc-850 rounded" />
            <div className="h-2.5 w-12 bg-zinc-850 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

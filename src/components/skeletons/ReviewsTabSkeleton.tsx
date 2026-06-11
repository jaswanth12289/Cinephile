import React from "react";

export function ReviewsTabSkeleton() {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl animate-pulse">
          {/* 60x90px poster rectangle */}
          <div className="w-[60px] h-[90px] bg-zinc-800 rounded-lg shrink-0" />
          
          {/* 3 text bars: title, stars, excerpt */}
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 w-1/3 bg-zinc-800 rounded" />
            <div className="h-3.5 w-1/5 bg-zinc-800 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-zinc-850 rounded" />
              <div className="h-3 w-5/6 bg-zinc-850 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

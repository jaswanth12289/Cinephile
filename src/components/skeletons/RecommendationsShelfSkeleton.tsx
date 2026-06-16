import React from "react";
import MediaCardSkeleton from "./MediaCardSkeleton";

export function RecommendationsShelfSkeleton() {
  return (
    <div className="space-y-4 w-full select-none py-2">
      <div className="flex items-center gap-3 pl-3 border-l-4 border-[#E94560]/30">
        <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse" />
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 select-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 shrink-0 w-24 sm:w-28">
            <MediaCardSkeleton />
            <div className="h-5 w-full bg-zinc-900/40 border border-white/5 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}


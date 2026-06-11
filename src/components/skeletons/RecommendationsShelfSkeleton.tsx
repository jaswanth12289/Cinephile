import React from "react";
import MediaCardSkeleton from "./MediaCardSkeleton";

export function RecommendationsShelfSkeleton() {
  return (
    <div className="space-y-4 w-full select-none py-2">
      <div className="flex items-center gap-3 pl-3 border-l-4 border-[#E94560]/30">
        <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <MediaCardSkeleton />
            <div className="h-6 w-full bg-zinc-900/40 border border-zinc-800/40 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

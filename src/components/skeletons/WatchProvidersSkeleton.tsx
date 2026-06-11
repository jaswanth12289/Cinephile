import React from "react";

export function WatchProvidersSkeleton() {
  return (
    <section className="bg-card/25 backdrop-blur-md rounded-2xl border border-border/30 p-5 space-y-5 select-none animate-pulse">
      {/* Title & Region Pills Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="h-6 w-36 bg-muted/40 rounded" />
        {/* Region pills skeleton */}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-8 bg-muted/20 rounded-md" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Category: Streaming */}
        <div className="space-y-2">
          <div className="h-3.5 w-24 bg-muted/30 rounded" />
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 border border-white/5 px-2.5 py-1.5 rounded-xl min-w-[110px]">
                <div className="h-6 w-6 rounded-md bg-muted/20 shrink-0" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Category: Rent */}
        <div className="space-y-2">
          <div className="h-3.5 w-16 bg-muted/25 rounded" />
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 border border-white/5 px-2.5 py-1.5 rounded-xl min-w-[110px]">
                <div className="h-6 w-6 rounded-md bg-muted/15 shrink-0" />
                <div className="h-3 w-12 bg-muted/25 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

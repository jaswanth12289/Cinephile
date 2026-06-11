import React from "react";

export default function FeedCardSkeleton() {
  return (
    <article className="bg-card/20 backdrop-blur-md border border-border/20 rounded-xl p-3.5 md:p-4 flex gap-3 shadow-sm select-none">
      {/* Left Column: Avatar */}
      <div className="flex-shrink-0">
        <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-muted/45 animate-pulse" />
      </div>

      {/* Right Column: Content Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Header Info */}
          <div className="flex items-center gap-1.5 pb-2">
            <div className="h-4 w-24 bg-muted/45 rounded animate-pulse" />
            <div className="h-3.5 w-16 bg-muted/30 rounded animate-pulse" />
            <div className="h-3.5 w-12 bg-muted/20 rounded animate-pulse" />
          </div>

          {/* Action text line */}
          <div className="h-5 w-48 bg-muted/45 rounded animate-pulse mb-3" />

          {/* Content Description Blocks */}
          <div className="space-y-1.5 mb-2">
            <div className="h-4 w-full bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-full bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
          </div>

          {/* Poster or media placeholder if any */}
          <div className="h-20 w-32 bg-muted/25 rounded-lg animate-pulse my-2" />
        </div>

        {/* Bottom Actions Row */}
        <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-2.5">
          <div className="h-6 w-12 bg-muted/30 rounded-full animate-pulse" />
          <div className="h-6 w-12 bg-muted/30 rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-muted/30 rounded-full animate-pulse" />
        </div>
      </div>
    </article>
  );
}

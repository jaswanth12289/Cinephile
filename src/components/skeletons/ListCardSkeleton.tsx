import React from "react";

export default function ListCardSkeleton() {
  return (
    <div className="bg-card/25 border border-white/5 rounded-2xl p-4 flex gap-4 shadow-md select-none animate-pulse">
      {/* Cover Collage Placeholder */}
      <div className="w-24 sm:w-28 aspect-[2/3] shrink-0 bg-muted/20 rounded-xl" />

      {/* List Details Placeholder */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-2">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-2/3 bg-muted/45 rounded" />
            <div className="h-4 w-12 bg-muted/30 rounded shrink-0" />
          </div>

          {/* Owner Username */}
          <div className="h-4 w-24 bg-muted/35 rounded" />

          {/* Description line placeholder */}
          <div className="space-y-1 pt-1">
            <div className="h-3.5 w-full bg-muted/20 rounded" />
            <div className="h-3.5 w-5/6 bg-muted/20 rounded" />
          </div>
        </div>

        {/* Footer info placeholder */}
        <div className="flex items-center justify-between pt-3">
          <div className="h-4.5 w-12 bg-muted/30 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-4.5 w-8 bg-muted/25 rounded" />
            <div className="h-4.5 w-8 bg-muted/25 rounded" />
            <div className="h-4.5 w-8 bg-muted/25 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

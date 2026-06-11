import React from "react";

export default function MediaCardSkeleton() {
  return (
    <div className="relative aspect-[2/3] w-full rounded-xl bg-card/40 border border-border/20 overflow-hidden shadow-md">
      <div className="absolute inset-0 bg-muted/5 cine-shimmer" />
      
      {/* Bottom Info bar for visual consistency */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent space-y-2">
        <div className="h-3.5 w-3/4 bg-muted/10 rounded cine-shimmer" />
        <div className="h-3 w-1/2 bg-muted/10 rounded cine-shimmer" />
      </div>
    </div>
  );
}

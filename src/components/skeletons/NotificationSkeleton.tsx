import React from "react";

export default function NotificationSkeleton() {
  return (
    <div className="space-y-2.5 w-full select-none">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card/20 border border-border/10 rounded-xl p-4 flex gap-3 items-center animate-pulse"
        >
          {/* Left Column: Icon Type Placeholder */}
          <div className="flex-shrink-0">
            <div className="h-7 w-7 bg-muted/30 rounded-lg animate-pulse" />
          </div>

          {/* Right Column: Text and Details */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-muted/20 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

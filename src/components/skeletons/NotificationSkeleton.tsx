import React from "react";

export default function NotificationSkeleton() {
  return (
    <div className="space-y-2.5 w-full select-none">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="cine-card p-4 flex gap-3 items-center"
        >
          {/* Left Column: Icon Type Placeholder */}
          <div className="flex-shrink-0">
            <div className="h-7 w-7 bg-white/10 rounded-lg cine-shimmer" />
          </div>

          {/* Right Column: Text and Details */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-white/10 rounded cine-shimmer" />
            <div className="h-3 w-1/4 bg-white/5 rounded cine-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

import React from "react";
import FeedCardSkeleton from "./FeedCardSkeleton";

export function FeedTimelineSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: 3 }).map((_, idx) => (
        <FeedCardSkeleton key={idx} />
      ))}
    </div>
  );
}

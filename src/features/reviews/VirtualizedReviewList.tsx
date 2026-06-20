"use client";

import { useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ReviewItem } from "./ReviewItem";

interface VirtualizedReviewListProps {
  reviews: any[];
}

export function VirtualizedReviewList({ reviews }: VirtualizedReviewListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: reviews.length,
    estimateSize: () => 140, // estimate height of a ReviewItem card
    overscan: 5,
    scrollMargin: 0,
  });

  return (
    <div
      ref={containerRef}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const review = reviews[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            }}
            className="pb-3"
          >
            <ReviewItem review={review} />
          </div>
        );
      })}
    </div>
  );
}

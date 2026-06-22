"use client";

import { ReviewItem } from "./ReviewItem";

interface VirtualizedReviewListProps {
  reviews: any[];
}

export function VirtualizedReviewList({ reviews }: VirtualizedReviewListProps) {
  return (
    <div className="flex flex-col space-y-3 w-full">
      {reviews.map((review) => (
        <div key={review.id} className="pb-3 w-full">
          <ReviewItem review={review} />
        </div>
      ))}
    </div>
  );
}

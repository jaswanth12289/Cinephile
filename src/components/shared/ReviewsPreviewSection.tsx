"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { ReviewItem } from "@/features/reviews/ReviewItem";
import { ExpandableSection } from "./ExpandableSection";

interface Review {
  id: string;
  rating: number;
  content: string;
  hasSpoilers?: boolean;
  containsSpoilers?: boolean;
  likesCount?: number;
  likes?: number;
  createdAt: any;
  user: {
    displayName: string;
    username: string;
    photoURL: string | null;
  };
}

interface ReviewsPreviewSectionProps {
  reviews: Review[];
  mediaId: string;
}

export function ReviewsPreviewSection({ reviews, mediaId }: ReviewsPreviewSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-[#101018]/50 border border-white/5 rounded-2xl select-none">
        <p className="font-bold text-white text-[13px] flex items-center justify-center gap-1.5">
          <span>⭐</span> No reviews yet
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">Be the first to review this title.</p>
      </div>
    );
  }

  const previewReviews = reviews.slice(0, 2);
  const hasMore = reviews.length > 2;

  return (
    <>
      <ExpandableSection
        title="Reviews"
        icon={<MessageSquare />}
        actionLabel={hasMore ? `See All (${reviews.length}) →` : undefined}
        onActionClick={hasMore ? () => setIsOpen(true) : undefined}
      >
        <div className="space-y-3">
          {previewReviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      </ExpandableSection>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`All Reviews (${reviews.length})`}
      >
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewItem key={`sheet-${review.id}`} review={review} />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

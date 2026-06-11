import { getReviews } from "@/actions/reviews.actions";
import { ReviewItem } from "./ReviewItem";

interface ReviewListProps {
  mediaId: string;
}

export async function ReviewList({ mediaId }: ReviewListProps) {
  const reviews = await getReviews(mediaId);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card/25 border border-border/30 rounded-xl select-none">
        <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
          <span>⭐</span> No reviews yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">Be the first to review this movie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review: any) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </div>
  );
}

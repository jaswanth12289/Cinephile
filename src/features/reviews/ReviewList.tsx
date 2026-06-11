import { getReviews } from "@/actions/reviews.actions";
import { Star, AlertTriangle, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

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
    <div className="space-y-4">
      {reviews.map((review: any) => (
        <article
          key={review.id}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <Link
              href={`/user/${review.user.username}`}
              className="flex items-center gap-3 group"
            >
              <SafeAvatar
                src={review.user.photoURL}
                alt={review.user.displayName}
                name={review.user.displayName}
                size={36}
                className="bg-muted border border-border"
              />
              <div>
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {review.user.displayName}
                </p>
                <p className="text-xs text-muted-foreground">@{review.user.username}</p>
              </div>
            </Link>

            {/* Stars */}
            <div className="flex items-center gap-0.5 shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${
                    s <= review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Spoiler warning */}
          {review.hasSpoilers && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-1.5 w-fit">
              <AlertTriangle className="h-3 w-3" />
              Contains spoilers
            </div>
          )}

          {/* Content */}
          <p className="text-sm text-foreground/90 leading-relaxed">{review.content}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
              {review.createdAt?._seconds
                ? new Date(review.createdAt._seconds * 1000).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5" />
              {review.likesCount}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

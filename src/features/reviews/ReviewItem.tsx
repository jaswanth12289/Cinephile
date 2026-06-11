"use client";

import { useState } from "react";
import { Star, Heart } from "lucide-react";
import Link from "next/link";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { cn } from "@/lib/utils";

interface ReviewItemProps {
  review: {
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
  };
}

export function ReviewItem({ review }: ReviewItemProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasSpoilers = review.hasSpoilers || review.containsSpoilers;
  const content = review.content || "";

  const dateStr = review.createdAt?._seconds
    ? new Date(review.createdAt._seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <article className="cine-card p-3.5 space-y-2.5 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link href={`/u/${review.user.username}`} className="flex items-center gap-2 group min-w-0">
          <SafeAvatar
            src={review.user.photoURL}
            alt={review.user.displayName}
            name={review.user.displayName}
            size={28}
            className="!h-7 !w-7 border-white/5"
          />
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-xs text-white group-hover:text-primary transition-colors truncate">
              {review.user.displayName}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">@{review.user.username}</p>
          </div>
        </Link>

        {/* Stars */}
        <div className="flex items-center gap-0.5 shrink-0 select-none">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-3 w-3 ${
                s <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content / Spoiler */}
      <div className="text-[13px] leading-relaxed text-zinc-300">
        {hasSpoilers && !showSpoiler ? (
          <div
            onClick={() => setShowSpoiler(true)}
            className="p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors select-none"
          >
            <span className="text-amber-500 font-bold text-[11px]">Contains spoilers. Click to reveal.</span>
          </div>
        ) : (
          <div>
            <p className={cn("break-words whitespace-pre-wrap font-medium", !expanded && "line-clamp-3")}>
              {content}
            </p>
            {(content.length > 150 || content.includes("\n")) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-primary hover:underline font-extrabold text-[10px] uppercase mt-1 cursor-pointer block"
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 select-none font-display border-t border-white/5 pt-2">
        <span suppressHydrationWarning>{dateStr}</span>
        <div className="flex items-center gap-1 font-bold text-zinc-400">
          <Heart className="h-3 w-3 fill-primary/10 text-zinc-450" />
          <span>{review.likesCount ?? review.likes ?? 0}</span>
        </div>
      </div>
    </article>
  );
}

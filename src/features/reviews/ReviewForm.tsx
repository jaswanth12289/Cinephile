"use client";

import { useState, useTransition } from "react";
import { createReview } from "@/actions/reviews.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  mediaId: string;
  mediaType: "movie" | "tv";
}

export function ReviewForm({ mediaId, mediaType }: ReviewFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [isFullReview, setIsFullReview] = useState(false);
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <p className="text-muted-foreground mb-3">Sign in to write a review</p>
        <Button onClick={() => router.push("/login")} size="sm">
          Sign In
        </Button>
      </div>
    );
  }

  const limit = isFullReview ? 2000 : 280;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating"); return; }
    if (content.trim().length < 1) { setError("Review content cannot be empty"); return; }
    if (content.length > limit) { setError(`Review cannot exceed ${limit} characters`); return; }
    setError("");

    startTransition(async () => {
      const result = await createReview(mediaId, mediaType, rating, content, hasSpoilers);
      if (result.success) {
        setSuccess(true);
        setRating(0);
        setContent("");
        setHasSpoilers(false);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border/30 rounded-2xl p-6 space-y-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
        <h3 className="font-black text-[18px] text-white uppercase tracking-tight">Write a Review</h3>
        
        {/* Mode Selector Tab Toggle */}
        <div className="flex gap-1.5 bg-secondary/50 p-1 rounded-xl w-fit select-none border border-white/5">
          <button
            type="button"
            onClick={() => {
              setIsFullReview(false);
              if (content.length > 280) setContent(content.slice(0, 280));
            }}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
              !isFullReview 
                ? "bg-primary text-white shadow" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            Quick Thoughts
          </button>
          <button
            type="button"
            onClick={() => setIsFullReview(true)}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
              isFullReview 
                ? "bg-primary text-white shadow" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            Full Review
          </button>
        </div>
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-1 select-none">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-115 cursor-pointer p-0.5"
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors duration-150",
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400 stroke-amber-400"
                  : "text-muted-foreground/40 stroke-muted-foreground/40 hover:text-white"
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-[13px] font-extrabold text-amber-400 uppercase tracking-wide">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
          </span>
        )}
      </div>

      {/* Text Area */}
      <div className="space-y-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={limit}
          placeholder={
            isFullReview 
              ? "Share your detailed analytical review about this title..." 
              : "Share your quick thoughts... (max 280 characters)"
          }
          rows={isFullReview ? 6 : 3}
          className="w-full rounded-xl border border-border/30 bg-input/20 px-3.5 py-3 text-[14px] text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none transition-all duration-200"
        />
        
        {/* Character Count Indicator */}
        <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground select-none">
          <span className={cn(content.length >= limit && "text-destructive")}>
            {content.length} / {limit} characters
          </span>
          {content.length >= limit && (
            <span className="text-destructive font-black uppercase tracking-wider">Limit Reached</span>
          )}
        </div>
      </div>

      {/* Spoiler Toggle */}
      <label className="flex items-center gap-2.5 text-[13px] font-bold cursor-pointer select-none text-gray-300 w-fit">
        <div
          onClick={() => setHasSpoilers((s) => !s)}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors cursor-pointer border border-white/5",
            hasSpoilers ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
              hasSpoilers ? "translate-x-4" : "translate-x-0"
            )}
          />
        </div>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Contains spoilers
        </span>
      </label>

      {error && <p className="text-[13px] text-destructive font-bold">{error}</p>}
      {success && <p className="text-[13px] text-emerald-400 font-bold">Review submitted successfully!</p>}

      <Button type="submit" disabled={isPending} className="w-full rounded-xl py-5 uppercase font-black tracking-wider text-[12px] bg-primary hover:bg-primary/95 text-white shadow-lg transition-all">
        {isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}

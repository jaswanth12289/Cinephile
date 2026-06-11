"use client";

import React, { useState, useTransition, memo } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MediaCard } from "./MediaCard";
import { submitRecommendationFeedback } from "@/actions/recommendations.actions";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface RecommendationItem {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  reason: string;
}

interface RecommendationsListProps {
  initialRecommendations: RecommendationItem[];
}

export const RecommendationsList = memo(function RecommendationsList({ initialRecommendations }: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(initialRecommendations);
  const [feedbackState, setFeedbackState] = useState<Record<number, "helpful" | "not_interested">>({});
  const [isPending, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const handleFeedback = (movieId: number, feedback: "helpful" | "not_interested") => {
    // Prevent double submissions
    if (feedbackState[movieId]) return;

    // Track analytics event
    trackEvent("recommendation_clicked", {
      movieId,
      feedback,
    });

    // Optimistic UI updates
    setFeedbackState((prev) => ({ ...prev, [movieId]: feedback }));

    if (feedback === "not_interested") {
      // Animate card dismissal after a brief delay to let action register
      setTimeout(() => {
        setRecommendations((prev) => prev.filter((m) => m.id !== movieId));
      }, 300);
    }

    // Server-side logging to Firestore
    startTransition(async () => {
      await submitRecommendationFeedback(movieId, feedback);
    });
  };

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 font-bold uppercase tracking-wider text-xs border border-zinc-900 bg-zinc-950/20 rounded-2xl select-none">
        No recommendations left. Rate more titles to refresh!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {recommendations.map((movie) => {
          const state = feedbackState[movie.id];
          const isHelpful = state === "helpful";

          return (
            <motion.div
              key={movie.id}
              layout={!shouldReduceMotion}
              initial={{ opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion 
                  ? { opacity: 0 } 
                  : { opacity: 0, x: -60, scale: 0.9, rotate: -2 }
              }
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-2 flex flex-col justify-between group relative"
            >
              {/* Media Card Poster container */}
              <div className="relative">
                <MediaCard
                  id={movie.id}
                  title={movie.title}
                  posterPath={movie.posterPath}
                  mediaType="movie"
                  rating={movie.voteAverage}
                  releaseDate={movie.releaseDate}
                />

                {/* Feedback Buttons Overlay */}
                <div className="absolute top-2 left-2 flex gap-1.5 z-20 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  {isHelpful ? (
                    <div className="h-11 w-11 rounded-full bg-emerald-500/90 text-white flex items-center justify-center border border-emerald-400 shadow-lg scale-105 select-none">
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFeedback(movie.id, "helpful");
                        }}
                        disabled={state !== undefined}
                        title="Helpful recommendation"
                        className={cn(
                          "h-11 w-11 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer",
                          "bg-black/60 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/85 hover:border-white/20"
                        )}
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFeedback(movie.id, "not_interested");
                        }}
                        disabled={state !== undefined}
                        title="Not interested"
                        className={cn(
                          "h-11 w-11 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer",
                          "bg-black/60 border border-white/10 text-zinc-300 hover:text-[#E94560] hover:bg-black/85 hover:border-white/20"
                        )}
                      >
                        <ThumbsDown className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Reason Badge */}
              <div
                className="text-[10px] text-[#E94560] font-black uppercase tracking-wider bg-[#E94560]/10 border border-[#E94560]/20 px-2 py-1 rounded-md truncate text-center select-none cursor-default group-hover:bg-[#E94560]/15 group-hover:border-[#E94560]/30 transition-colors"
                title={movie.reason}
              >
                {movie.reason}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

RecommendationsList.displayName = "RecommendationsList";

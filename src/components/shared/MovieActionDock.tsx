"use client";

import React, { useState, useTransition } from "react";
import { Eye, Bookmark, Heart, Star, Check, X } from "lucide-react";
import { setWatchStatus, toggleFavoriteMedia } from "@/actions/tracking.actions";
import { createReview } from "@/actions/reviews.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHapticLight, triggerHapticMedium } from "@/lib/native/haptics";

interface MovieActionDockProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  initialWatchStatus: "watched" | "watching" | "want_to_watch" | "dropped" | null;
  initialIsFavorite: boolean;
  initialUserRating: number | null;
}

export function MovieActionDock({
  mediaId,
  mediaType,
  initialWatchStatus,
  initialIsFavorite,
  initialUserRating,
}: MovieActionDockProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state tracking
  const [watchStatus, setWatchStatusState] = useState(initialWatchStatus);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [rating, setRating] = useState<number | null>(initialUserRating);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    triggerHapticMedium();
    const nextStatus = watchStatus === "watched" ? null : "watched";
    setWatchStatusState(nextStatus);
    startTransition(async () => {
      await setWatchStatus(mediaId, mediaType, nextStatus);
      router.refresh();
    });
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    triggerHapticMedium();
    const nextStatus = watchStatus === "want_to_watch" ? null : "want_to_watch";
    setWatchStatusState(nextStatus);
    startTransition(async () => {
      await setWatchStatus(mediaId, mediaType, nextStatus);
      router.refresh();
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    triggerHapticMedium();
    setIsFavorite(!isFavorite);
    startTransition(async () => {
      const res = await toggleFavoriteMedia(mediaId, mediaType);
      if (res.success) {
        setIsFavorite(res.isFavorite ?? false);
        router.refresh();
      }
    });
  };

  const handleRate = (stars: number) => {
    if (!user) { router.push("/login"); return; }

    triggerHapticLight();
    setRating(stars);
    setShowRatingMenu(false);
    startTransition(async () => {
      await createReview(mediaId, mediaType, stars, "", false);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      {/* Rating Popover */}
      <AnimatePresence>
        {showRatingMenu && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 p-2 bg-[#101018]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex items-center gap-1.5",
              // Adjust layout anchor for desktop vs mobile
              "bottom-full left-1/2 -translate-x-1/2 mb-3"
            )}
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const starsVal = idx + 1;
              const isFilled = hoveredStar !== null ? starsVal <= hoveredStar : (rating !== null ? starsVal <= rating : false);
              return (
                <button
                  key={idx}
                  onClick={() => handleRate(starsVal)}
                  onMouseEnter={() => {
                    setHoveredStar(starsVal);
                    triggerHapticLight();
                  }}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="p-1 cursor-pointer hover:scale-115 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isFilled ? "fill-amber-400 text-amber-400" : "text-zinc-500 hover:text-white"
                    )}
                  />
                </button>
              );
            })}
            <button
              onClick={() => setShowRatingMenu(false)}
              className="p-1 text-zinc-400 hover:text-white ml-1.5 border-l border-white/10 pl-2 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Action Bar Dock */}
      {/* 
        On Mobile: Floating Pill Dock above bottom nav (bottom-[80px])
        On Desktop: Standard Inline Pill
      */}
      <div
        className={cn(
          "flex items-center justify-around gap-4 shadow-xl border border-white/10 bg-[#09090F]/90 backdrop-blur-xl transition-all duration-300",
          // Mobile responsive placement (floating pill at bottom)
          "fixed bottom-[80px] left-1/2 -translate-x-1/2 z-40 rounded-full px-7 py-3 w-[280px] max-w-[90vw]",
          // Desktop override (sits inline in layout)
          "md:relative md:bottom-auto md:left-auto md:translate-x-0 md:rounded-xl md:px-5 md:py-2.5 md:w-full md:max-w-none md:justify-start md:gap-7"
        )}
      >
        {/* Watched Action */}
        <button
          onClick={handleToggleWatched}
          disabled={isPending}
          title="Mark as Watched"
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95",
            watchStatus === "watched" ? "text-green-400" : "text-zinc-400 hover:text-white"
          )}
        >
          <Eye className={cn("h-5 w-5", watchStatus === "watched" && "fill-green-400/20")} />
          <span className="text-[9px] font-black uppercase mt-1 tracking-wider md:block hidden">Watched</span>
        </button>

        {/* Watchlist Action */}
        <button
          onClick={handleToggleWatchlist}
          disabled={isPending}
          title="Add to Watchlist"
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95",
            watchStatus === "want_to_watch" ? "text-primary" : "text-zinc-400 hover:text-white"
          )}
        >
          <Bookmark className={cn("h-5 w-5", watchStatus === "want_to_watch" && "fill-primary/20")} />
          <span className="text-[9px] font-black uppercase mt-1 tracking-wider md:block hidden">Watchlist</span>
        </button>

        {/* Favorite Action */}
        <button
          onClick={handleToggleFavorite}
          disabled={isPending}
          title="Add to Favorites"
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95",
            isFavorite ? "text-pink-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-pink-500")} />
          <span className="text-[9px] font-black uppercase mt-1 tracking-wider md:block hidden">Favorite</span>
        </button>

        {/* Rate Action */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setShowRatingMenu(!showRatingMenu);
          }}
          title="Rate Media"
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95",
            rating !== null ? "text-amber-400" : "text-zinc-400 hover:text-white"
          )}
        >
          <Star className={cn("h-5 w-5", rating !== null && "fill-amber-400")} />
          <span className="text-[9px] font-black uppercase mt-1 tracking-wider md:block hidden">
            {rating !== null ? `Rated ${rating}` : "Rate"}
          </span>
        </button>
      </div>
    </div>
  );
}

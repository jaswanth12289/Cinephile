"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, useEffect, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Star, Bookmark, Eye, Info, Check, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { setWatchStatus } from "@/actions/tracking.actions";
import { createReview } from "@/actions/reviews.actions";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  mediaType: "movie" | "tv";
  rating?: number;
  releaseDate?: string;
  genreIds?: number[];
  initialStatus?: "watched" | "watching" | "want_to_watch" | "dropped" | null;
  layout?: "standard" | "large" | "dense" | "wide";
  backdropPath?: string | null;
  priority?: boolean;
}

const genreMap: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Doc",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export const MediaCard = memo(function MediaCard({
  id,
  title,
  posterPath,
  mediaType,
  rating,
  releaseDate,
  genreIds = [],
  initialStatus = null,
  layout = "standard",
  backdropPath = null,
  priority = false,
}: MediaCardProps) {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [status, setStatus] = useState<typeof initialStatus>(initialStatus);
  const [localRating, setLocalRating] = useState<number | undefined>(rating);
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [hoveredStarRating, setHoveredStarRating] = useState<number | null>(null);
  const [ratedRating, setRatedRating] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isWide = layout === "wide";
  
  const imageUrl = isWide
    ? (backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : "/placeholder-backdrop.png")
    : (posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "/placeholder-poster.svg");

  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";

  const genres = genreIds
    .map((gid) => genreMap[gid])
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  const handleTrack = (e: React.MouseEvent, newStatus: "want_to_watch" | "watched") => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    const nextStatus = status === newStatus ? null : newStatus;
    startTransition(async () => {
      setStatus(nextStatus);
      await setWatchStatus(id.toString(), mediaType, nextStatus);
    });
  };

  const handleRate = async (ratingVal: number) => {
    if (!user) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      setRatedRating(ratingVal);
      // Optimistically average out the local rating display
      const currentAvg = localRating || 0;
      setLocalRating(currentAvg > 0 ? (currentAvg + ratingVal) / 2 : ratingVal);
      
      await createReview(id.toString(), mediaType, ratingVal, "", false);
      
      // Auto close the selector after a success feedback delay
      setTimeout(() => {
        setShowRatingSelector(false);
        setRatedRating(null);
      }, 1000);
    });
  };

  return (
    <div
      className="relative z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowRatingSelector(false);
      }}
    >
      <Link href={`/${mediaType}/${id}`}>
        <motion.div
          animate={shouldReduceMotion ? {} : (isHovered ? { y: -3, scale: 1.02, filter: "brightness(1.05)", zIndex: 50 } : { y: 0, scale: 1, filter: "brightness(1)", zIndex: 10 })}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "relative w-full overflow-hidden rounded-xl bg-card border border-white/6 shadow-[0_8px_40px_rgba(0,0,0,0.4)] cursor-pointer",
            isWide ? "aspect-[16/9]" : "aspect-[2/3]"
          )}
        >
          {/* Main Poster Image */}
          <div className="absolute inset-0 bg-white/1 cine-shimmer" />
          <Image
            src={imgSrc}
            alt={title}
            fill
            className={cn(
              "object-cover transition-transform duration-300",
              isHovered && "brightness-[0.4]"
            )}
            sizes={isWide ? "(max-width: 768px) 50vw, 30vw" : "(max-width:768px) 50vw, 25vw"}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            onError={() => setImgSrc(isWide ? "/placeholder-backdrop.png" : "/placeholder-poster.svg")}
          />

          {/* Static rating tag (unhovered) */}
          {!isHovered && localRating && localRating > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] font-black text-amber-400 border border-amber-400/20 shadow-md">
              <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" />
              {localRating.toFixed(1)}
            </div>
          )}

          {/* Interactive Info Pane on Hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black via-black/85 to-transparent"
              >
                {/* Text Metadata */}
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-white leading-tight line-clamp-1">
                    {title}
                  </h3>

                  <div className="flex items-center gap-2 text-[10px] text-gray-300">
                    {year && <span className="font-extrabold text-white">{year}</span>}
                    {localRating && localRating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-400 font-black">
                        <Star className="h-2.8 w-2.8 fill-amber-400 stroke-amber-400" />
                        {localRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {genres && (
                    <p className="text-[9px] text-muted-foreground font-semibold truncate">
                      {genres}
                    </p>
                  )}
                </div>

                {/* Inline Action Pane */}
                <div className="mt-2 pt-2 border-t border-white/10 min-h-[32px] flex items-center">
                  <AnimatePresence mode="wait">
                    {showRatingSelector ? (
                      /* 5-Star Rating Selector (Future-proofed rating modal) */
                      <motion.div
                        key="rating-selector"
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {ratedRating ? (
                          <div className="flex items-center justify-center gap-1 w-full text-emerald-400 text-[10px] font-black uppercase">
                            <Check className="h-3 w-3 stroke-[3]" />
                            Rated {ratedRating} ★
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, idx) => {
                                const ratingVal = idx + 1;
                                const isHighlighted =
                                  hoveredStarRating !== null
                                    ? ratingVal <= hoveredStarRating
                                    : false;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleRate(ratingVal)}
                                    onMouseEnter={() => setHoveredStarRating(ratingVal)}
                                    onMouseLeave={() => setHoveredStarRating(null)}
                                    className="p-0.5 hover:scale-115 transition-transform"
                                  >
                                    <Star
                                      className={cn(
                                        "h-3.5 w-3.5 transition-colors duration-150",
                                        isHighlighted
                                          ? "fill-amber-400 stroke-amber-400"
                                          : "text-gray-400 stroke-gray-400 hover:text-white"
                                      )}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => setShowRatingSelector(false)}
                              className="text-muted-foreground hover:text-white p-0.5 ml-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      /* Quick Actions Row */
                      <motion.div
                        key="actions"
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                        className="flex items-center gap-2 w-full"
                      >
                        {/* Want to Watch */}
                        <button
                          onClick={(e) => handleTrack(e, "want_to_watch")}
                          disabled={isPending}
                          aria-label="Add to Watchlist"
                          className={cn(
                            "flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-full border bg-white/5 backdrop-blur-md transition-all duration-200",
                            status === "want_to_watch"
                              ? "border-primary text-primary bg-primary/20 scale-105"
                              : "border-white/10 text-white hover:border-white/30 hover:bg-white/10"
                          )}
                        >
                          <Bookmark className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                        </button>

                        {/* Watched */}
                        <button
                          onClick={(e) => handleTrack(e, "watched")}
                          disabled={isPending}
                          aria-label="Mark as Watched"
                          className={cn(
                            "flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-full border bg-white/5 backdrop-blur-md transition-all duration-200",
                            status === "watched"
                              ? "border-emerald-500 text-emerald-500 bg-emerald-500/20 scale-105"
                              : "border-white/10 text-white hover:border-white/30 hover:bg-white/10"
                          )}
                        >
                          {status === "watched" ? (
                            <Check className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <Eye className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                          )}
                        </button>

                        {/* Quick Inline Rate Toggle */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowRatingSelector(true);
                          }}
                          aria-label="Rate this title inline"
                          className="flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-400 transition-all duration-200"
                        >
                          <Star className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                        </button>

                        {/* Details Info Button */}
                        <div className="flex-1 flex justify-end">
                          <div className="flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white hover:border-white/30 hover:bg-white/10 transition-all duration-200">
                            <Info className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </div>
  );
});

MediaCard.displayName = "MediaCard";

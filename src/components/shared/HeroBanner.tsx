"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Play, Bookmark, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { setWatchStatus } from "@/actions/tracking.actions";
import { cn } from "@/lib/utils";
import type { TMDBMedia } from "@/lib/tmdb/fallbackData";

import { TMDBErrorRecovery } from "./TMDBErrorRecovery";

interface HeroBannerProps {
  mediaList: TMDBMedia[];
  loading?: boolean;
}

// ... (genreMap is defined above, starting around line 20)

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

export function HeroBanner({ mediaList, loading = false }: HeroBannerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [watchlistStatus, setWatchlistStatus] = useState<Record<number, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // Skeleton Loader for Hero
  if (loading) {
    return (
      <div className="w-full h-[280px] sm:h-[350px] md:h-[420px] lg:h-[480px] rounded-2xl border border-border/40 bg-card/25 animate-pulse flex items-end p-8">
        <div className="space-y-4 max-w-md w-full">
          <div className="h-6 w-28 rounded-md bg-muted" />
          <div className="h-10 w-3/4 rounded-md bg-muted" />
          <div className="h-4 w-1/2 rounded-md bg-muted" />
          <div className="h-16 w-full rounded-md bg-muted" />
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-md bg-muted" />
            <div className="h-10 w-28 rounded-md bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Filter items that actually have backdrops
  const items = mediaList ? mediaList.filter((item) => item.backdrop_path).slice(0, 5) : [];

  if (items.length === 0) {
    return <TMDBErrorRecovery title="Featured Spotlight" />;
  }

  const activeMedia = items[activeIndex];
  const activeYear = activeMedia.release_date || activeMedia.first_air_date
    ? new Date(activeMedia.release_date || activeMedia.first_air_date!).getFullYear()
    : "";

  const activeGenres = activeMedia.genre_ids
    .map((gid) => genreMap[gid])
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");

  const imageUrl = activeMedia.backdrop_path
    ? `https://image.tmdb.org/t/p/original${activeMedia.backdrop_path}`
    : "/placeholder-backdrop.png";

  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handleWatchlistToggle = (e: React.MouseEvent, media: TMDBMedia) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    const currentStatus = watchlistStatus[media.id];
    const newStatus = currentStatus ? null : "want_to_watch";

    startTransition(async () => {
      setWatchlistStatus((prev) => ({
        ...prev,
        [media.id]: !currentStatus,
      }));
      await setWatchStatus(media.id.toString(), media.media_type, newStatus as any);
    });
  };

  return (
    <div className="relative h-[280px] sm:h-[350px] md:h-[420px] lg:h-[480px] w-full overflow-hidden rounded-2xl border border-border/40 bg-[#07070F] shadow-2xl group/hero">
      {/* Background Images with Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Image
            src={imgSrc}
            alt={activeMedia.title || activeMedia.name || "Hero Banner"}
            fill
            priority
            className="object-cover"
            onError={() => setImgSrc("/placeholder-backdrop.png")}
          />
        </motion.div>
      </AnimatePresence>

      {/* Modern Gradient Overlays - adjusted for better brightness */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(15,15,26,0.1)_0%,_rgba(15,15,26,0.6)_85%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0F0F1A] via-transparent to-transparent" />
      <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />

      {/* Manual Chevron Navigation (Only show if multiple items) */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-xl"
            aria-label="Previous featured title"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/hero:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-xl"
            aria-label="Next featured title"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Slide Controls Indicator (Dot indicators at bottom right) */}
      <div className="absolute right-6 bottom-6 flex items-center gap-1.5 z-30">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === activeIndex
                ? "w-5 bg-primary"
                : "w-1.5 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-8 max-w-xl">
        <div className="space-y-3">
          {/* Badge */}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 backdrop-blur-md">
            Featured Spotlight
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md line-clamp-2">
            {activeMedia.title || activeMedia.name}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
            {activeYear && (
              <span className="font-extrabold text-white">{activeYear}</span>
            )}
            <span className="h-1 w-1 rounded-full bg-white/20" />
            {activeMedia.vote_average > 0 && (
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                {activeMedia.vote_average.toFixed(1)}
              </span>
            )}
            {activeGenres && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="text-gray-400 font-medium">{activeGenres}</span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-xs md:text-sm text-gray-300 line-clamp-2 leading-relaxed drop-shadow-sm font-medium hidden sm:block">
            {activeMedia.overview}
          </p>

          {/* Call to Actions */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Link href={`/${activeMedia.media_type}/${activeMedia.id}`}>
              <Button size="sm" className="bg-primary hover:bg-primary/95 text-white font-extrabold px-5 h-9 shadow-lg hover:shadow-primary/20 transition-all">
                <Play className="h-3.5 w-3.5 fill-white mr-1.5" />
                Details
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleWatchlistToggle(e, activeMedia)}
              disabled={isPending}
              className={cn(
                "border-white/10 bg-white/5 backdrop-blur-md text-white font-bold h-9 px-4 hover:bg-white/10 hover:border-white/35 transition-all",
                watchlistStatus[activeMedia.id] && "border-primary text-primary bg-primary/10"
              )}
            >
              {watchlistStatus[activeMedia.id] ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Wishlisted
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                  Watchlist
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Globe, Tv, Trophy, Film, Sparkles, Gem, Flame, Users, LucideIcon } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  globe: Globe,
  tv: Tv,
  trophy: Trophy,
  film: Film,
  sparkles: Sparkles,
  gem: Gem,
  flame: Flame,
  users: Users,
};

interface CarouselSectionProps {
  title: string;
  data: any[] | null; // null represents error state
  loading?: boolean;
  mediaType: "movie" | "tv";
  iconName?: string;
  layout?: "standard" | "large" | "dense" | "wide";
}

export function CarouselSection({
  title,
  data,
  loading = false,
  mediaType,
  iconName,
  layout = "standard",
}: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const router = useRouter();

  const Icon = iconName ? iconMap[iconName] : null;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll();
    }
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [data]);

  useEffect(() => {
    if (data === null && !loading) {
      console.warn(`[TMDB API Error] Failed to load content for section: "${title}" (mediaType: "${mediaType}")`);
    }
  }, [data, title, mediaType, loading]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isDense = layout === "dense";
  const isWide = layout === "wide";
  const isLarge = layout === "large";

  // Resolve item container class for carousels
  let itemWidthClass = "min-w-[130px] md:min-w-[150px] lg:min-w-[160px] max-w-[130px] md:max-w-[150px] lg:max-w-[160px] flex-shrink-0";
  if (isLarge) {
    itemWidthClass = "min-w-[160px] md:min-w-[190px] lg:min-w-[210px] max-w-[160px] md:max-w-[190px] lg:max-w-[210px] flex-shrink-0";
  } else if (isWide) {
    itemWidthClass = "min-w-[220px] md:min-w-[280px] lg:min-w-[320px] max-w-[220px] md:max-w-[280px] lg:max-w-[320px] flex-shrink-0";
  }

  return (
    <section className="relative group/carousel space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 w-full select-none">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            {title}
          </h2>
        </div>
      </div>

      <div className="relative">
        {/* Error/Retry State */}
        {data === null && !loading && (
          <div className="w-full h-[220px] rounded-xl border border-white/5 bg-[#101018]/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-black text-white font-display">
                Unable to load content from TMDB.
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto font-medium">
              Please check your internet connection or API keys configuration and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log(`[TMDB API] Retrying data fetch for: "${title}"...`);
                router.refresh();
              }}
              className="gap-1.5 font-bold font-display"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </Button>
          </div>
        )}


        {/* Skeleton Loading State */}
        {loading && (
          <div className={cn(isDense ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3" : "flex gap-4 overflow-x-hidden py-1")}>
            {Array.from({ length: isDense ? 8 : 7 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl bg-[#101018] border border-white/5 animate-pulse",
                  isDense ? "aspect-[2/3] w-full" : (isWide ? "aspect-[16/9] min-w-[220px] md:min-w-[280px]" : "aspect-[2/3] min-w-[130px] md:min-w-[150px]")
                )}
              />
            ))}
          </div>
        )}

        {/* Live Data Grid / Scroller */}
        {data !== null && !loading && (
          isDense ? (
            /* Dense grid representation (e.g. for Anime Spotlight) */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 py-1">
              {data.map((item) => (
                <div key={item.id} className="w-full">
                  <MediaCard
                    id={item.id}
                    title={item.title || item.name}
                    posterPath={item.poster_path}
                    mediaType={item.media_type || mediaType}
                    rating={item.vote_average}
                    releaseDate={item.release_date || item.first_air_date}
                    genreIds={item.genre_ids}
                    layout="dense"
                    backdropPath={item.backdrop_path}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Left navigation arrow */}
              {showLeftArrow && (
                <button
                  onClick={() => scroll("left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Right navigation arrow */}
              {showRightArrow && (
                <button
                  onClick={() => scroll("right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Scrolling container */}
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide py-1 scroll-smooth"
              >
                {data.map((item) => (
                  <div
                    key={item.id}
                    className={itemWidthClass}
                  >
                    <MediaCard
                      id={item.id}
                      title={item.title || item.name}
                      posterPath={item.poster_path}
                      mediaType={item.media_type || mediaType}
                      rating={item.vote_average}
                      releaseDate={item.release_date || item.first_air_date}
                      genreIds={item.genre_ids}
                      layout={layout}
                      backdropPath={item.backdrop_path}
                    />
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}

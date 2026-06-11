"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Globe, Tv, Trophy, Film, Sparkles, Gem, Flame, Users, LucideIcon } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBErrorRecovery } from "./TMDBErrorRecovery";

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
  priority?: boolean;
}

export function CarouselSection({
  title,
  data,
  loading = false,
  mediaType,
  iconName,
  layout = "standard",
  priority = false,
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

  // Resolve item container class for grids/carousels
  let itemWidthClass = "w-full max-w-[170px] md:min-w-[150px] md:max-w-[150px] lg:min-w-[160px] lg:max-w-[160px] md:flex-shrink-0";
  if (isLarge) {
    itemWidthClass = "w-full max-w-[170px] md:min-w-[190px] md:max-w-[190px] lg:min-w-[210px] lg:max-w-[210px] md:flex-shrink-0";
  } else if (isWide) {
    itemWidthClass = "w-full max-w-[320px] md:min-w-[280px] md:max-w-[280px] lg:min-w-[320px] lg:max-w-[320px] md:flex-shrink-0";
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
          <TMDBErrorRecovery title={title} />
        )}


        {/* Skeleton Loading State */}
        {loading && (
          <div className={cn(
            isDense 
              ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3" 
              : "grid grid-cols-2 sm:grid-cols-3 place-items-center gap-4 md:flex md:gap-4 md:overflow-x-hidden py-1"
          )}>
            {Array.from({ length: isDense ? 8 : 6 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl bg-[#101018] border border-white/5 animate-pulse w-full max-w-[170px] md:max-w-none",
                  isDense 
                    ? "aspect-[2/3]" 
                    : (isWide 
                        ? "aspect-[16/9] max-w-[320px] md:min-w-[280px]" 
                        : "aspect-[2/3] md:min-w-[130px] md:min-w-[150px]")
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
              {data.map((item, idx) => (
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
                    priority={priority && idx < 2}
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
                  className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-40 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Right navigation arrow */}
              {showRightArrow && (
                <button
                  onClick={() => scroll("right")}
                  className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-40 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Grid on mobile, horizontal scroll on desktop */}
              <div
                ref={scrollRef}
                className="grid grid-cols-2 sm:grid-cols-3 place-items-center gap-4 md:flex md:gap-4 md:overflow-x-auto md:scrollbar-hide py-1 scroll-smooth"
              >
                {data.map((item, idx) => (
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
                      priority={priority && idx < 2}
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

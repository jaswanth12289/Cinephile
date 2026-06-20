"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Globe, Tv, Trophy, Film, Sparkles, Gem, Flame, Users, LucideIcon } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBErrorRecovery } from "./TMDBErrorRecovery";
import { triggerHapticLight } from "@/lib/native/haptics";

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
  slug?: string;
}

export function CarouselSection({
  title,
  data,
  loading = false,
  mediaType,
  iconName,
  layout = "standard",
  priority = false,
  slug,
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
    triggerHapticLight();
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

  // Limit display list items to 15 if slug is defined
  const items = (slug && data) ? data.slice(0, 15) : (data || []);

  // Resolve responsive item container widths (Netflix-style compact sizes on mobile w-24 sm:w-28)
  let itemWidthClass = "w-24 sm:w-28 md:w-36 lg:w-40 flex-shrink-0 snap-start";
  if (isLarge) {
    itemWidthClass = "w-28 sm:w-32 md:w-44 lg:w-48 flex-shrink-0 snap-start";
  } else if (isWide) {
    itemWidthClass = "w-48 sm:w-56 md:w-72 lg:w-80 flex-shrink-0 snap-start";
  }

  return (
    <section className="relative group/carousel space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between mb-3 select-none">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-blue-400" />}
          <h2 className="text-[15px] font-bold text-white tracking-tight">
            {title}
          </h2>
        </div>
        {slug && (
          <Link
            href={`/discover/${slug}`}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            See all
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Error/Retry State */}
        {data === null && !loading && (
          <TMDBErrorRecovery title={title} />
        )}

        {/* Skeleton Loading State */}
        {loading && (
          <div className="flex gap-3 overflow-x-hidden py-1 w-full select-none">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl bg-[#101018] border border-white/5 animate-pulse flex-shrink-0",
                  isWide ? "aspect-[16/9] w-48 sm:w-56 md:w-72" : "aspect-[2/3] w-24 sm:w-28 md:w-36"
                )}
              />
            ))}
          </div>
        )}

        {/* Live Data Scroller */}
        {data !== null && !loading && (
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

            {/* strictly horizontal row scroller */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide py-1 scroll-smooth snap-x select-none w-full"
            >
              {items.map((item, idx) => (
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
        )}
      </div>
    </section>
  );
}

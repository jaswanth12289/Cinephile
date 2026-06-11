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
}

export function CarouselSection({
  title,
  data,
  loading = false,
  mediaType,
  iconName,
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

  return (
    <section className="relative group/carousel space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 border-b border-border/20 pb-1 w-full">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h2 className="text-base md:text-lg font-black tracking-tight text-white uppercase">
            {title}
          </h2>
        </div>
      </div>

      <div className="relative">
        {/* Error/Retry State */}
        {data === null && !loading && (
          <div className="w-full h-[220px] rounded-xl border border-border/40 bg-card/25 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-black text-white">
                Unable to load content from TMDB.
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm font-medium">
              Please check your internet connection or API keys configuration and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log(`[TMDB API] Retrying data fetch for: "${title}"...`);
                router.refresh();
              }}
              className="border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:text-primary gap-1.5 font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </Button>
          </div>
        )}


        {/* Skeleton Loading State */}
        {loading && (
          <div className="flex gap-4 overflow-x-hidden py-1">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="min-w-[130px] md:min-w-[150px] lg:min-w-[160px] aspect-[2/3] rounded-xl bg-card border border-border/30 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Live Data Grid / Scroller */}
        {data !== null && !loading && (
          <>
            {/* Left navigation arrow */}
            {showLeftArrow && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Right navigation arrow */}
            {showRightArrow && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/90 hover:scale-105 shadow-2xl"
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
                  className="min-w-[130px] md:min-w-[150px] lg:min-w-[160px] max-w-[130px] md:max-w-[150px] lg:max-w-[160px] flex-shrink-0"
                >
                  <MediaCard
                    id={item.id}
                    title={item.title || item.name}
                    posterPath={item.poster_path}
                    mediaType={item.media_type || mediaType}
                    rating={item.vote_average}
                    releaseDate={item.release_date || item.first_air_date}
                    genreIds={item.genre_ids}
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

"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/ui/button";

interface RecommendationsGridProps {
  title?: string;
  data?: any[];
  mediaType: "movie" | "tv";
  loading?: boolean;
}

export function RecommendationsGrid({
  title = "Recommendations",
  data = [],
  mediaType,
  loading = false,
}: RecommendationsGridProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <section className="space-y-3 select-none">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#A1A1AA] animate-pulse" />
            <h2 className="text-sm md:text-base font-black tracking-wider text-[#A1A1AA] uppercase font-display">
              {title}
            </h2>
          </div>
        </div>
        
        {/* Pulse Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 py-1">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#101018] border border-white/5 animate-pulse w-full aspect-[2/3]"
            />
          ))}
        </div>
      </section>
    );
  }

  // Limit initial results to 6 items (exactly 2 rows on mobile grid-cols-3, 1 row on desktop grid-cols-6)
  const displayItems = expanded ? data.slice(0, 18) : data.slice(0, 6);
  const hasMore = data.length > 6;

  return (
    <section className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            {title}
          </h2>
        </div>
      </div>

      {/* Grid: grid-cols-3 on mobile, grid-cols-4 on tablet, grid-cols-6 on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 py-1">
        {displayItems.map((item, idx) => (
          <div key={item.id} className="w-full">
            <MediaCard
              id={item.id}
              title={item.title || item.name}
              posterPath={item.poster_path}
              mediaType={item.media_type || mediaType}
              rating={item.vote_average}
              releaseDate={item.release_date || item.first_air_date}
              genreIds={item.genre_ids}
              layout="dense" // Dense makes the poster rendering compact and responsive
              backdropPath={item.backdrop_path}
              priority={idx < 3}
            />
          </div>
        ))}
      </div>

      {/* See More/Less Button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="border-white/10 bg-white/3 hover:bg-white/8 text-xs font-extrabold uppercase tracking-wider h-8 px-4 cursor-pointer text-zinc-300 hover:text-white"
          >
            {expanded ? (
              <>
                See Less <ChevronUp className="ml-1 h-3.5 w-3.5" />
              </>
            ) : (
              <>
                See More <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

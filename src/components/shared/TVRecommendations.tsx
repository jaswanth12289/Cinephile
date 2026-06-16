import React from "react";
import { getTVRecommendations } from "@/lib/tmdb/client";
import { MediaCard } from "./MediaCard";
import { ExpandableSection } from "./ExpandableSection";
import { Sparkles } from "lucide-react";

export async function TVRecommendations({ id }: { id: string }) {
  const data = await getTVRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  const displayItems = results.slice(0, 6);
  const hasMore = results.length > 6;

  return (
    <ExpandableSection
      title="Recommendations"
      icon={Sparkles}
      actionLabel={hasMore ? "See All →" : undefined}
      actionHref={`/tv/${id}/recommendations`}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x select-none">
        {displayItems.map((item: any, idx: number) => (
          <div key={item.id} className="shrink-0 w-24 sm:w-28 snap-start">
            <MediaCard
              id={item.id}
              title={item.name}
              posterPath={item.poster_path}
              mediaType="tv"
              rating={item.vote_average}
              releaseDate={item.first_air_date}
              layout="dense"
              priority={idx < 2}
            />
          </div>
        ))}
        {hasMore && (
          <a
            href={`/tv/${id}/recommendations`}
            className="flex flex-col items-center justify-center shrink-0 w-24 sm:w-28 aspect-[2/3] rounded-xl border border-dashed border-white/20 bg-white/3 hover:bg-white/5 hover:border-primary/50 transition-all select-none snap-start cursor-pointer group"
          >
            <span className="text-[11px] font-black uppercase text-zinc-400 group-hover:text-primary transition-colors">
              See All →
            </span>
          </a>
        )}
      </div>
    </ExpandableSection>
  );
}


import React from "react";
import { getMovieRecommendations } from "@/lib/tmdb/client";
import { MediaCard } from "./MediaCard";
import { ExpandableSection } from "./ExpandableSection";
import { Sparkles } from "lucide-react";

export async function MovieRecommendations({ id }: { id: string }) {
  const data = await getMovieRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  const displayItems = results.slice(0, 15);
  const hasMore = results.length > 15;

  return (
    <ExpandableSection
      title="Recommendations"
      icon={<Sparkles />}
      actionLabel={hasMore ? "See All →" : undefined}
      actionHref={`/movie/${id}/recommendations`}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x select-none">
        {displayItems.map((item: any, idx: number) => (
          <div key={item.id} className="shrink-0 w-24 sm:w-28 snap-start">
            <MediaCard
              id={item.id}
              title={item.title}
              posterPath={item.poster_path}
              mediaType="movie"
              rating={item.vote_average}
              releaseDate={item.release_date}
              layout="dense"
              priority={idx < 2}
            />
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
}


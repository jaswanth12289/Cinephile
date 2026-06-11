import React from "react";
import { getTVRecommendations } from "@/lib/tmdb/client";
import { CarouselSection } from "./CarouselSection";

export async function TVRecommendations({ id }: { id: string }) {
  const data = await getTVRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  return (
    <CarouselSection
      title="Recommendations"
      data={results}
      mediaType="tv"
      iconName="sparkles"
      layout="standard"
      priority={true}
    />
  );
}

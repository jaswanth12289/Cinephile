import React from "react";
import { getMovieRecommendations } from "@/lib/tmdb/client";
import { CarouselSection } from "./CarouselSection";

export async function MovieRecommendations({ id }: { id: string }) {
  const data = await getMovieRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  return (
    <CarouselSection
      title="Recommendations"
      data={results}
      mediaType="movie"
      iconName="sparkles"
      layout="standard"
      priority={true}
    />
  );
}

import React from "react";
import { getMovieRecommendations } from "@/lib/tmdb/client";
import { RecommendationsGrid } from "./RecommendationsGrid";

export async function MovieRecommendations({ id }: { id: string }) {
  const data = await getMovieRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  return (
    <RecommendationsGrid
      title="Recommendations"
      data={results}
      mediaType="movie"
    />
  );
}

import React from "react";
import { getTVRecommendations } from "@/lib/tmdb/client";
import { RecommendationsGrid } from "./RecommendationsGrid";

export async function TVRecommendations({ id }: { id: string }) {
  const data = await getTVRecommendations(id);
  const results = data?.results || [];

  if (results.length === 0) return null;

  return (
    <RecommendationsGrid
      title="Recommendations"
      data={results}
      mediaType="tv"
    />
  );
}

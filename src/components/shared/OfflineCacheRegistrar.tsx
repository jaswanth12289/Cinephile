"use client";

import { useEffect } from "react";
import { cacheMovieDetails, cacheTVDetails, addRecentlyViewed } from "@/lib/offline/offlineCache";

interface OfflineCacheRegistrarProps {
  id: string;
  mediaType: "movie" | "tv";
  data: any;
}

export function OfflineCacheRegistrar({ id, mediaType, data }: OfflineCacheRegistrarProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !data) return;

    // Cache the detail payload for offline access
    if (mediaType === "movie") {
      cacheMovieDetails(id, data).catch(() => {});
    } else {
      cacheTVDetails(id, data).catch(() => {});
    }

    // Add to Recently Viewed history
    addRecentlyViewed({
      id,
      mediaType,
      title: data.title || data.name || "Film Details",
      posterPath: data.poster_path || null,
    }).catch(() => {});
  }, [id, mediaType, data]);

  return null;
}

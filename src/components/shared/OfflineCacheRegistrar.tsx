"use client";

import { useEffect } from "react";
import { cacheMovieDetails, cacheTVDetails, addRecentlyViewed } from "@/lib/offline/offlineCache";

interface OfflineCacheRegistrarProps {
  id: string;
  mediaType: "movie" | "tv";
  data: any;
}

export function OfflineCacheRegistrar({ id, mediaType, data }: OfflineCacheRegistrarProps) {
  // DISABLED FOR RC15 STABILITY MODE
  return null;
}

"use client";

import { useEffect, useState } from "react";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/offline/offlineCache";
import { MediaCard } from "./MediaCard";
import { History } from "lucide-react";

export function RecentlyViewedShelf() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentlyViewed() {
      try {
        const list = await getRecentlyViewed();
        setItems(list);
      } catch (err) {
        console.warn("RecentlyViewedShelf error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecentlyViewed();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <section className="relative group/carousel space-y-3.5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 select-none">
        <div className="flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            Recently Viewed
          </h2>
        </div>
      </div>

      <div className="relative">
        {/* Scroller container */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 scroll-smooth snap-x select-none w-full">
          {items.map((item) => (
            <div
              key={`${item.mediaType}-${item.id}`}
              className="w-24 sm:w-28 md:w-36 lg:w-40 flex-shrink-0 snap-start"
            >
              <MediaCard
                id={Number(item.id)}
                title={item.title}
                posterPath={item.posterPath}
                mediaType={item.mediaType}
                cacheEnabled={true} // Cache recently viewed image
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

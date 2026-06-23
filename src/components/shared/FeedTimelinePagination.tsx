"use client";

import React, { useState } from "react";
import { FeedSafeCard } from "./FeedSafeCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { fetchFeedActivitiesAction } from "@/actions/social.actions";

interface FeedTimelinePaginationProps {
  uid: string;
  initialLastDocId: string | null;
  initialActivities?: any[];
}

export function FeedTimelinePagination({
  uid,
  initialLastDocId,
  initialActivities = []
}: FeedTimelinePaginationProps) {
  const [activities, setActivities] = useState<any[]>(initialActivities);
  const [lastDocId, setLastDocId] = useState<string | null>(initialLastDocId);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLastDocId !== null);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchFeedActivitiesAction({ cursor: lastDocId || undefined, limit: 10 });
      if (res.activities && res.activities.length > 0) {
        setActivities((prev) => {
          const existingIds = new Set(prev.map(a => a.activity.id));
          const newUnique = res.activities.filter((a: any) => !existingIds.has(a.activity.id));
          return [...prev, ...newUnique];
        });
        setLastDocId(res.nextCursor || null);
        if (res.activities.length < 10 || !res.nextCursor) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("[FeedTimelinePagination] failed to load more:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const triggerRef = useInfiniteScroll(loadMore, {
    disabled: loading || !hasMore,
    rootMargin: "200px"
  });

  return (
    <div className="space-y-4">
      {/* Paginated Stream (Standard List) */}
      <div className="flex flex-col space-y-4">
        {activities.map((item) => {
          if (!item) return null;
          // Item has { activity, actor, reactions, userActiveReaction, initialSaved } etc
          // We pass it directly to FeedSafeCard
          return (
            <FeedSafeCard 
              key={item.activity.id}
              activity={item}
            />
          );
        })}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={triggerRef} className="h-16 w-full flex items-center justify-center select-none mt-4">
          {loading && (
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

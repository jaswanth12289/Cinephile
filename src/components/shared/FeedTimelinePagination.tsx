"use client";

import React, { useState } from "react";
import { FeedCard } from "./FeedCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { fetchFeedActivitiesAction } from "@/actions/social.actions";

interface FeedTimelinePaginationProps {
  uid: string;
  initialLastDocId: string | null;
}

export function FeedTimelinePagination({
  uid,
  initialLastDocId
}: FeedTimelinePaginationProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [lastDocId, setLastDocId] = useState<string | null>(initialLastDocId);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLastDocId !== null);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchFeedActivitiesAction(uid, lastDocId || undefined, 10);
      if (res.success && res.activities) {
        setActivities((prev) => [...prev, ...res.activities]);
        setLastDocId(res.lastDocId || null);
        if (res.activities.length < 10 || !res.lastDocId) {
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
    <div className="space-y-2.5">
      {/* Paginated Stream */}
      {activities.map(({ activity, actor, reactions, userActiveReaction, initialSaved }) => (
        <FeedCard
          key={activity.id}
          activity={activity as any}
          actor={actor}
          initialReactions={reactions}
          initialUserReaction={userActiveReaction}
          initialSaved={initialSaved}
        />
      ))}

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={triggerRef} className="h-16 w-full flex items-center justify-center select-none">
          {loading && (
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

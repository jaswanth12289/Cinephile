"use client";

import React, { useState, useRef } from "react";
import { FeedCard } from "./FeedCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { fetchFeedActivitiesAction } from "@/actions/social.actions";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

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

  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: activities.length,
    estimateSize: () => 180, // estimate height of a FeedCard
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchFeedActivitiesAction(uid, lastDocId || undefined, 10);
      if (res.success && res.activities) {
        setActivities((prev) => {
          const existingIds = new Set(prev.map(a => a.activity.id));
          const newUnique = res.activities!.filter(a => !existingIds.has(a.activity.id));
          return [...prev, ...newUnique];
        });
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
      {/* Paginated Virtualized Stream */}
      <div
        ref={listRef}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = activities[virtualRow.index];
          if (!item) return null;
          const { activity, actor, reactions, userActiveReaction, initialSaved } = item;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
              className="pb-2.5"
            >
              <FeedCard
                activity={activity as any}
                actor={actor}
                initialReactions={reactions}
                initialUserReaction={userActiveReaction}
                initialSaved={initialSaved}
                isSavedPost={item.isSavedPost}
                userPollVote={item.userPollVote}
              />
            </div>
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

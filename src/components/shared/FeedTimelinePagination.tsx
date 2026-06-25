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

/**
 * Transforms a raw Supabase activity row (snake_case, with nested profiles join)
 * into the shape that FeedCard expects.
 * Used for client-side pagination loads (server-side initial data is already transformed).
 */
function transformRawActivity(raw: any) {
  const profile = raw.profiles || {};
  return {
    activity: {
      id: raw.id,
      userId: raw.user_id,
      type: raw.type,
      movieId: raw.movie_id || null,
      tvId: raw.tv_id || null,
      rating: raw.rating != null ? Number(raw.rating) : null,
      reviewText: raw.review_text || null,
      postText: raw.post_text || null,
      imageUrls: raw.image_urls || [],
      poll: raw.poll || null,
      quoteActivityId: raw.quote_activity_id || null,
      quoteSnapshot: raw.quote_snapshot || null,
      mediaSnapshot: raw.media_snapshot || null,
      containsSpoilers: raw.contains_spoilers || false,
      listId: raw.list_id || null,
      listTitle: raw.list_title || null,
      clubId: raw.club_id || null,
      clubName: raw.club_name || null,
      likesCount: raw.likes_count || 0,
      commentsCount: raw.comments_count || 0,
      reactions: raw.reactions || { love: 0, peak: 0, emotional: 0, mindblown: 0, applause: 0 },
      hashtags: raw.hashtags || [],
      mentions: raw.mentions || [],
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    },
    actor: {
      displayName: profile.display_name || "Cinephile User",
      username: profile.username || "unknown",
      photoURL: profile.avatar_url || "",
    },
    reactions: raw.reactions || { love: 0, peak: 0, emotional: 0, mindblown: 0, applause: 0 },
    userActiveReaction: null,
    initialSaved: false,
  };
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
        // Transform raw Supabase rows into the shape FeedCard expects
        const transformed = res.activities.map(transformRawActivity);
        setActivities((prev) => {
          const existingIds = new Set(prev.map(a => a.activity?.id));
          const newUnique = transformed.filter((a: any) => !existingIds.has(a.activity?.id));
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
          if (!item?.activity?.id) return null;
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

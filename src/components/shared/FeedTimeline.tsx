import { fetchFeedActivitiesAction } from "@/actions/social.actions";
import { getTrending } from "@/lib/tmdb/client";
import { MediaCard } from "@/components/shared/MediaCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Star, Compass } from "lucide-react";
import { FeedTimelinePagination } from "@/components/shared/FeedTimelinePagination";

interface FeedTimelineProps {
  uid: string;
}

/**
 * Transforms a raw Supabase activity row (snake_case, with nested profiles join)
 * into the shape that FeedCard / FeedTimelinePagination expects.
 */
function transformActivity(raw: any) {
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

export async function FeedTimeline({ uid }: FeedTimelineProps) {
  // Call the consolidated, batch-optimized action
  const res = await fetchFeedActivitiesAction({ limit: 10 });
  const rawActivities = res.activities || [];
  const lastDocId = res.nextCursor || null;

  // Transform raw Supabase rows into the shape FeedCard expects
  const resolvedActivities = rawActivities.map(transformActivity);

  // For fallback recommendations if no activities found
  let recommendations: any[] = [];
  if (resolvedActivities.length === 0) {
    try {
      const trendingData = await getTrending("movie", "week");
      recommendations = trendingData?.results?.slice(0, 6) || [];
    } catch (err) {
      console.warn("Failed to fetch fallback trending movies:", err);
    }
  }

  return (
    <>
      {resolvedActivities.length === 0 ? (
        <div className="space-y-6 pt-2">
          <EmptyState
            icon={<Compass />}
            title="Your timeline is empty."
            description="Follow cinephiles to bring your timeline to life."
            actionHref="/search"
            actionText="Find Friends & Movies"
          />

          {/* Recommendations */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/30 pb-2 select-none">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="text-[18px] font-bold tracking-tight text-white uppercase animate-pulse">
                Recommended For You
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {recommendations.map((item: any) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  title={item.title || item.name}
                  posterPath={item.poster_path}
                  mediaType="movie"
                  rating={item.vote_average}
                  releaseDate={item.release_date || item.first_air_date}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <FeedTimelinePagination
          uid={uid}
          initialLastDocId={lastDocId}
          initialActivities={resolvedActivities}
        />
      )}
    </>
  );
}

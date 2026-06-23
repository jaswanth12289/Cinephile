import { fetchFeedActivitiesAction } from "@/actions/social.actions";
import { getTrending } from "@/lib/tmdb/client";
import { MediaCard } from "@/components/shared/MediaCard";
import { FeedCard } from "@/components/shared/FeedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Star, Compass } from "lucide-react";
import { FeedTimelinePagination } from "@/components/shared/FeedTimelinePagination";

interface FeedTimelineProps {
  uid: string;
}

export async function FeedTimeline({ uid }: FeedTimelineProps) {
  // Call the consolidated, batch-optimized action
  const res = await fetchFeedActivitiesAction({ limit: 10 });
  const resolvedActivities = res.activities || [];
  const lastDocId = res.nextCursor || null;

  // Resolve whether user is following people or fallback feed
  const isFollowersFeed = resolvedActivities.length > 0;

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        /* Stream of Activities (virtualized inside FeedTimelinePagination) */
        <FeedTimelinePagination
          uid={uid}
          initialLastDocId={lastDocId}
          initialActivities={resolvedActivities}
        />
      )}
    </>
  );
}

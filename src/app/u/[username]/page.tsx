// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "@/actions/auth.actions";
import { withTimeout } from "@/lib/withTimeout";
import { getFollowStatus } from "@/actions/social.actions";

const PROFILE_QUERIES = process.env.NODE_ENV === "development";
import { notFound } from "next/navigation";
import { FollowButton } from "@/features/social/FollowButton";
import { FavoritesGrid } from "@/features/user/FavoritesGrid";
import TasteRadar from "@/components/profile/TasteRadar";
import SimilarTasteUsers from "@/components/shared/SimilarTasteUsers";
import { FeedCard } from "@/components/shared/FeedCard";
import { MediaCard } from "@/components/shared/MediaCard";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { CachedImage } from "@/components/shared/CachedImage";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";
import { ProfileTabs } from "@/components/shared/ProfileTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { ProfileHeaderSkeleton } from "@/components/skeletons/ProfileHeaderSkeleton";
import { ReviewsTabSkeleton } from "@/components/skeletons/ReviewsTabSkeleton";
import { ListsTabSkeleton } from "@/components/skeletons/ListsTabSkeleton";
import { Rss, Film, List as ListIcon, Bookmark, Star } from "lucide-react";
import { getCachedUserPreferences } from "@/lib/recommendations/analyzePreferences";
import { AnalyticsDashboard } from "@/components/profile/AnalyticsDashboard";
import { getUserStats, getHeatmapData } from "@/actions/stats.actions";
import { BADGE_DEFINITIONS } from "@/lib/badges/badgeEngine";
import { SessionRecovery } from "@/components/shared/SessionRecovery";

export const dynamic = "force-dynamic";

function renderStars(rating: number | null): string {
  if (rating === null || rating === undefined || rating === 0) return "";
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? "½" : "";
  return "★".repeat(fullStars) + halfStar;
}

// ─── TAB COMPONENTS ────────────────────────────────────────────────────────

// 0. Stats Tab
async function StatsTab({ uid }: { uid: string }) {
  const [stats, heatmapData] = await Promise.all([
    getUserStats(uid),
    getHeatmapData(uid)
  ]);
  // @ts-expect-error - heatmapData can be undefined but component expects Record<string, number>
  return <AnalyticsDashboard stats={stats} heatmapData={heatmapData} />;
}

// 1. Reviews Tab Component
async function ReviewsTab({ uid }: { uid: string }) {
  try {
    const supabase = createServiceClient();
    const { data: snap } = await supabase
      .from("activities")
      .select("*")
      .eq("type", "reviewed")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);

    const rawReviews = (snap || []).map((doc) => ({
      ...doc,
      mediaId: doc.movie_id || doc.tv_id,
      mediaType: doc.movie_id ? "movie" : "tv",
      content: doc.review_text,
    })) as any[];

    const reviews = await Promise.all(
      rawReviews.slice(0, 20).map(async (review) => {
        let mediaDetails = null;
        try {
          if (review.mediaType === "tv") {
            mediaDetails = await getTVDetails(review.mediaId);
          } else {
            mediaDetails = await getMovieDetails(review.mediaId);
          }
        } catch (e) {
          console.warn("Error fetching TMDB in ReviewsTab:", e);
        }
        return {
          ...review,
          media: mediaDetails ? {
            title: mediaDetails.title || mediaDetails.name,
            posterPath: mediaDetails.poster_path,
          } : null
        };
      })
    );

    if (reviews.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
          <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
            <span>⭐</span> No reviews yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">This user hasn't written any reviews yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-4 p-4 bg-[#161623]/20 border border-zinc-800/60 rounded-xl">
            <div className="relative w-[60px] h-[90px] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-850 shrink-0">
              {review.media?.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${review.media.posterPath}`}
                  alt={review.media.title}
                  fill
                  sizes="60px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500 font-bold uppercase text-center p-1">No Poster</div>
              )}
            </div>
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-[14px] font-black text-white uppercase tracking-wide">
                  {review.media?.title || "Film Details"}
                </span>
                {review.rating > 0 && (
                  <span className="text-amber-400 font-extrabold text-[13px]">
                    {renderStars(review.rating)}
                  </span>
                )}
              </div>
              <p className="text-[13.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                {review.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.warn("ReviewsTab error:", error);
    return (
      <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
        <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
          <span>⚠️</span> Community temporarily unavailable.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }
}

// 2. Lists Tab Component
async function ListsTab({ uid }: { uid: string }) {
  try {
    const supabase = createServiceClient();
    const { data: rawLists = [] } = await supabase
      .from("lists")
      .select("*")
      .eq("owner_id", uid)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    const lists = rawLists.map((l: any) => ({
      ...l,
      itemsCount: l.items_count,
      likesCount: l.likes_count,
      featuredItems: l.featured_items,
    }));

    if (lists.length === 0) {
      return (
        <div className="py-8">
          <EmptyState
            icon={<div className="text-4xl">📚</div>}
            title="No lists available"
            description="This user hasn't created any public lists yet."
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {lists.map((list) => {
          const posters = (list.featuredItems || []).slice(0, 3).map((i: any) => i.posterPath).filter(Boolean);
          while (posters.length < 3 && posters.length > 0) {
            posters.push(posters[0]);
          }
          return (
            <Link href={`/list/${list.slug || list.id}`} key={list.id} className="block">
              <div className="border border-zinc-800/80 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between h-28 transition-all group">
                <div className="flex items-center pl-2 relative h-12">
                  {posters.map((poster: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative h-12 aspect-[2/3] rounded-md overflow-hidden border border-black/50 shadow-xl -ml-2 transition-transform group-hover:translate-x-1.5 duration-200"
                      style={{ zIndex: 10 - idx }}
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${poster}`}
                        alt="List Poster"
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                  
                  <div className="flex-1 pl-4 flex flex-col justify-center min-w-0">
                    <h4 className="text-xs font-black text-white group-hover:text-primary transition-colors line-clamp-1">
                      {list.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 mt-1 border-t border-white/5">
                  <span className="font-extrabold uppercase">{list.itemsCount || 0} films</span>
                  <span className="flex items-center gap-1 font-extrabold text-gray-300">
                    <Star className="h-3 w-3 fill-primary/10 text-primary" />
                    {list.likesCount || 0} likes
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  } catch (error) {
    console.warn("ListsTab error:", error);
    return (
      <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
        <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
          <span>⚠️</span> Community temporarily unavailable.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }
}

// 3. Activity Tab Component
async function ActivityTab({ 
  uid, 
  username, 
  displayName, 
  photoURL, 
  session 
}: { 
  uid: string; 
  username: string; 
  displayName: string; 
  photoURL: string | null;
  session: any;
}) {
  try {
    const startTime = performance.now();
    const supabase = createServiceClient();
    const { data: snap } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(15);

    const rawActivities = (snap || [])
      .map((doc: any) => {
        let normalizedType = doc.type;
        if (doc.type === "watch" || doc.type === "rate") {
          normalizedType = "watched";
        } else if (doc.type === "review") {
          normalizedType = "reviewed";
        }

        const isoDateStr = doc.created_at || new Date().toISOString();

        return {
          id: doc.id,
          userId: doc.user_id,
          type: normalizedType,
          movieId: doc.movie_id,
          tvId: doc.tv_id,
          rating: doc.rating,
          reviewText: doc.review_text,
          containsSpoilers: doc.has_spoilers || false,
          createdAt: isoDateStr,
          postText: doc.post_text,
          mentions: doc.mentions || [],
          hashtags: doc.hashtags || [],
          imageUrls: doc.image_urls || [],
          poll: doc.poll || null,
          quoteSnapshot: doc.quote_snapshot || null,
          quoteActivityId: doc.quote_activity_id || null,
          listTitle: doc.list_title || null,
          listId: doc.list_id || null,
          activitySnapshot: doc.activity_snapshot || null,
          mediaSnapshot: doc.media_snapshot || null,
          commentsCount: doc.comments_count || 0,
          reactions: doc.reactions || null,
          likesCount: doc.likes_count || 0,
        };
      })
      .filter((act) => act.type && ["watched", "reviewed", "rewatched", "finished_series", "watchlist_added", "list_created", "post"].includes(act.type));

    const slice = rawActivities.slice(0, 15);

    // Empty maps for tracking and reactions to keep the migration safe
    const trackingMap = new Map<string, any>();
    const userReactionMap = new Map<string, string>();

    const resolvedActivities = await Promise.all(
      slice.map(async (act) => {
        try {
          const reactions = act.reactions || {
            love: 0,
            peak: 0,
            emotional: 0,
            mindblown: 0,
            applause: 0,
          };

          const userActiveReaction = userReactionMap.get(act.id) || null;

          let initialSaved = false;
          const mediaId = act.movieId || act.tvId;
          if (session && mediaId) {
            initialSaved = trackingMap.get(`${session.uid}_${mediaId}`)?.status === "want_to_watch";
          }

          const actor = {
            displayName,
            username,
            photoURL,
          };

          return {
            activity: act,
            actor,
            reactions,
            userActiveReaction,
            initialSaved,
          };
        } catch (e) {
          console.warn("Error resolving profile activity:", e);
          return {
            activity: act,
            actor: { displayName, username, photoURL },
            reactions: { love: 0, peak: 0, emotional: 0, mindblown: 0, applause: 0 },
            userActiveReaction: null,
            initialSaved: false,
          };
        }
      })
    );

    if (PROFILE_QUERIES) {
      console.log("[PROFILE] Profile query:", (performance.now() - startTime).toFixed(2), "ms");
    }

    if (resolvedActivities.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
          <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
            <span>👥</span> No community activity yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {resolvedActivities.map(({ activity, actor, reactions, userActiveReaction, initialSaved }) => (
          <FeedCard
            key={activity.id}
            activity={activity as any}
            actor={actor}
            initialReactions={reactions}
            initialUserReaction={userActiveReaction}
            initialSaved={initialSaved}
          />
        ))}
      </div>
    );
  } catch (error) {
    console.warn("ActivityTab error:", error);
    return (
      <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
        <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
          <span>⚠️</span> Community temporarily unavailable.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }
}

// 4. Watchlist Tab Component
async function WatchlistTab({ uid }: { uid: string }) {
  try {
    const supabase = createServiceClient();
    const { data: rawWatchlist = [] } = await supabase
      .from("activities")
      .select("*")
      .eq("type", "watchlist_added")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(24);

    const mappedWatchlist = rawWatchlist.map((item: any) => ({
      mediaId: item.movie_id || item.tv_id,
      mediaType: item.movie_id ? "movie" : "tv",
    }));

    const items = await Promise.all(
      mappedWatchlist.slice(0, 24).map(async (item) => {
        let details = null;
        try {
          if (item.mediaType === "tv") {
            details = await getTVDetails(item.mediaId);
          } else {
            details = await getMovieDetails(item.mediaId);
          }
        } catch (e) {
          console.warn("Error fetching TMDB in WatchlistTab:", e);
        }
        return {
          id: item.mediaId,
          title: details ? (details.title || details.name) : "Film Details",
          posterPath: details?.poster_path || null,
          mediaType: item.mediaType,
          rating: details?.vote_average || 0,
          releaseDate: details ? (details.release_date || details.first_air_date) : "",
        };
      })
    );

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
          <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
            <span>🎬</span> Watchlist is empty.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Start collecting movies you'll never forget.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            id={item.id}
            title={item.title}
            posterPath={item.posterPath}
            mediaType={item.mediaType}
            rating={item.rating}
            releaseDate={item.releaseDate}
            cacheEnabled={true}
          />
        ))}
      </div>
    );
  } catch (error) {
    console.warn("WatchlistTab error:", error);
    return (
      <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
        <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
          <span>⚠️</span> Community temporarily unavailable.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }
}

// 5. Favorites Tab Component
function FavoritesTab({ favorites, isOwnProfile }: { favorites: any[]; isOwnProfile: boolean }) {
  return (
    <div className="max-w-md bg-white/3 p-4 rounded-xl border border-white/5 shadow-sm">
      <FavoritesGrid initialFavorites={favorites} isOwnProfile={isOwnProfile} />
    </div>
  );
}

async function FavoriteGenres({ uid }: { uid: string }) {
  try {
    const preferences = await getCachedUserPreferences(uid);
    const { topGenres } = preferences;

    if (!topGenres || topGenres.length === 0) return null;

    const totalCount = topGenres.reduce((sum, g) => sum + g.count, 0);
    // Show top 3 genres
    const displayGenres = topGenres.slice(0, 3).map((g) => ({
      genre: g.name,
      percentage: totalCount > 0 ? Math.round((g.count / totalCount) * 100) : 0,
    }));

    return (
      <div className="mt-4 space-y-2 select-none font-display">
        <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Favorite Genres</h3>
        <div className="flex flex-wrap gap-2">
          {displayGenres.map((g) => (
            <div 
              key={g.genre}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/15 shadow-sm"
            >
              <span>{g.genre}</span>
              <span className="text-white/60 text-[10px] font-semibold">{g.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (e) {
    console.warn("Error displaying favorite genres component on profile:", e);
    return null;
  }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function Page({ params, searchParams }: UserProfilePageProps) {
  const { username } = await params;
  const { tab = "activity" } = await searchParams;
  const usernameLower = username.toLowerCase();

  const supabase = createServiceClient();
  const { data: userDoc } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", usernameLower)
    .single();

  if (!userDoc) {
    notFound();
  }

  const uid = userDoc.id;
  const userData = {
    ...userDoc,
    displayName: userDoc.display_name,
    photoURL: userDoc.avatar_url,
    bannerURL: userDoc.banner_url,
  };

  const session = await verifySession();

  // Basic counts since we're keeping it simple for phase 9
  const followersCount = userDoc.followers_count || 0;
  const followingCount = userDoc.following_count || 0;
  const reviewsCount = 0;
  const watchlistCount = 0;
  const listsCount = 0;
  const postsCount = 0;

  const isOwnProfile = session?.id === uid;
  const { isFollowing } = await getFollowStatus(uid);

  let tasteMatchResult = null;
  if (!isOwnProfile && session) {
    const { calculateUserSimilarity } = await import("@/lib/similarity");
    tasteMatchResult = await calculateUserSimilarity(session.uid, uid);
  }

  return (
    <div className="min-h-screen bg-[#09090F] pb-16">
      <SessionRecovery sessionKey="profile" />
      {/* BANNER */}
      <div 
        className="relative h-32 sm:h-44 w-full overflow-hidden bg-[#09090F]"
        style={!userData.bannerURL ? {
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.2) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(233, 69, 96, 0.2) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, transparent 40%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E")
          `
        } : undefined}
      >
        {userData.bannerURL && (
          <Image 
            src={userData.bannerURL} 
            fill 
            className="object-cover" 
            alt="Profile Banner" 
            priority
          />
        )}
        {/* Subtle vignette and bottom dark shadow to blend seamlessly into page body */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-transparent to-black/30" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-8 mb-4 relative z-10">
          {/* AVATAR */}
          <div className="relative h-20 w-20 shrink-0 select-none -mt-10">
            <SafeAvatar
              src={userData.photoURL}
              alt={userData.displayName || "Avatar"}
              name={userData.displayName || "C"}
              size={80}
              className="!h-20 !w-20 sm:!h-24 sm:!w-24 border-4 border-[#09090F] shadow-2xl"
            />
          </div>

          {/* ACTION BUTTON */}
          <div className="select-none flex items-center gap-2">
            {!isOwnProfile && tasteMatchResult && (
              <div className="hidden sm:flex flex-col items-end mr-2 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">Taste Match</span>
                <span className="text-lg font-black text-amber-500 leading-none">{tasteMatchResult.similarityScore}%</span>
              </div>
            )}
            {isOwnProfile ? (
              <Link href="/setup-profile">
                <Button variant="secondary" size="sm">
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Link href={`/u/${username}/compare`}>
                  <Button variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white bg-black/40">
                    Compare
                  </Button>
                </Link>
                <FollowButton
                  targetUserId={uid}
                  targetUsername={userData.username}
                  initialIsFollowing={isFollowing}
                />
              </>
            )}
          </div>
        </div>

        {/* METADATA */}
        <div className="space-y-1.5 mt-2">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight font-display">
              {userData.displayName}
            </h1>
            <p className="text-zinc-500 text-xs font-bold">
              @{userData.username}
            </p>
          </div>
          {userData.accountType && (
            <div className="pt-0.5 select-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/5 text-zinc-200 border border-white/5">
                {userData.accountType === "viewer" && "🎬 Viewer"}
                {userData.accountType === "reviewer" && "⭐ Reviewer"}
                {userData.accountType === "curator" && "📚 Curator"}
                {userData.accountType === "creator" && "🎥 Creator"}
              </span>
            </div>
          )}
          {userData.badges && userData.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 select-none">
              {userData.badges.map((badgeId: string) => {
                const badgeInfo = Object.values(BADGE_DEFINITIONS).find(b => b.id === badgeId);
                if (!badgeInfo) return null;
                return (
                  <div key={badgeId} className="group relative">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors cursor-help">
                      {badgeInfo.icon}
                    </span>
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-50 border border-white/10">
                      {badgeInfo.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {userData.bio && (
            <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 max-w-md leading-relaxed whitespace-pre-wrap">
              {userData.bio}
            </p>
          )}

          {/* Favorite Genre Badge */}
          {userData.favoriteGenre && (
            <div className="pt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 tracking-wider font-display">
                {userData.favoriteGenre}
              </span>
            </div>
          )}
        </div>

        {/* STATS ROW (Glass chips) */}
        <div className="flex flex-wrap items-center gap-2 py-3 mt-4 border-y border-white/5 select-none font-display">
          <Link href={`/u/${username}?tab=activity`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "activity" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{followersCount}</span> Followers
            </div>
          </Link>

          <Link href={`/u/${username}?tab=activity`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "activity" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{followingCount}</span> Following
            </div>
          </Link>

          <Link href={`/u/${username}?tab=reviews`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "reviews" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{reviewsCount}</span> Reviews
            </div>
          </Link>

          <Link href={`/u/${username}?tab=activity`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "activity" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{postsCount}</span> Thoughts
            </div>
          </Link>

          <Link href={`/u/${username}?tab=watchlist`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "watchlist" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{watchlistCount}</span> Watched
            </div>
          </Link>

          <Link href={`/u/${username}?tab=lists`}>
            <div className={cn("px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-sm",
              tab === "lists" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-xs">{listsCount}</span> Lists
            </div>
          </Link>

          {/* Activity Streak Display */}
          {(userData.currentStreak > 0 || userData.longestStreak > 0) && (
            <div className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 shadow-sm ml-auto select-none" title={`Longest streak: ${userData.longestStreak || userData.currentStreak} days`}>
              <span>🔥</span>
              <span className="font-black text-white text-xs">{userData.currentStreak || 0}</span> Day Streak
            </div>
          )}
        </div>

        {/* FAVORITES SECTION (Letterboxd Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#A1A1AA] font-display select-none">
                Favorite Films
              </h2>
              <div className="bg-white/3 p-4 rounded-xl border border-white/5 shadow-sm">
                <FavoritesGrid initialFavorites={userData.favorites || [null, null, null, null]} isOwnProfile={isOwnProfile} />
              </div>
            </div>

            {/* Autocomplete / Affinity (Optional sub-favorites details) */}
            {(userData.favoriteMovie || userData.favoriteGenre) && (
              <div className="flex flex-wrap items-center gap-4">
                {userData.favoriteMovie && (
                  <div className="p-2.5 cine-glass rounded-xl flex items-center gap-3 max-w-xs shadow-md">
                    <div className="relative w-[36px] h-[54px] rounded overflow-hidden bg-[#101018] border border-white/5 shrink-0">
                      {userData.favoriteMovie.posterPath ? (
                        <CachedImage 
                          src={`https://image.tmdb.org/t/p/w185${userData.favoriteMovie.posterPath}`}
                          alt={userData.favoriteMovie.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                          cacheEnabled={true}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[7px] text-zinc-400 font-bold uppercase">No Image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-[#A1A1AA] font-black uppercase tracking-wider font-display">Favorite Film</p>
                      <p className="text-xs text-white font-extrabold truncate mt-0.5 tracking-wide font-display">{userData.favoriteMovie.title}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <TasteRadar 
              data={[
                { axis: userData.favoriteGenre || "Sci-Fi", value: 95 },
                { axis: "Drama", value: 80 },
                { axis: "90s", value: 65 },
                { axis: "Action", value: 85 },
                { axis: "Foreign", value: 45 },
              ]} 
            />
            {session && <SimilarTasteUsers uid={uid} limit={3} />}
          </div>
        </div>


        {/* Profile Tabs with Haptic feedback */}
        <ProfileTabs tab={tab} username={username} />

        {/* TAB CONTENT (wrapped in Suspense with matching skeletons) */}
        <div className="mt-6">
          {tab === "reviews" && (
            <Suspense fallback={<ReviewsTabSkeleton />} key={uid + "-reviews"}>
              <ReviewsTab uid={uid} />
            </Suspense>
          )}

          {tab === "lists" && (
            <Suspense fallback={<ListsTabSkeleton />} key={uid + "-lists"}>
              <ListsTab uid={uid} />
            </Suspense>
          )}

          {tab === "activity" && (
            <Suspense fallback={<ReviewsTabSkeleton />} key={uid + "-activity"}>
              <ActivityTab 
                uid={uid} 
                username={userData.username} 
                displayName={userData.displayName} 
                photoURL={userData.photoURL || null}
                session={session}
              />
            </Suspense>
          )}

          {tab === "watchlist" && (
            <Suspense fallback={<ListsTabSkeleton />} key={uid + "-watchlist"}>
              <WatchlistTab uid={uid} />
            </Suspense>
          )}

          {tab === "favorites" && (
            <Suspense fallback={<ListsTabSkeleton />} key={uid + "-favorites"}>
              <FavoritesTab favorites={userData.favorites || [null, null, null, null]} isOwnProfile={isOwnProfile} />
            </Suspense>
          )}

          {tab === "stats" && (
            <Suspense fallback={<div className="animate-pulse h-96 bg-white/5 rounded-2xl" />} key={uid + "-stats"}>
              <StatsTab uid={uid} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

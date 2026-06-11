import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/actions/auth.actions";
import { withTimeout } from "@/lib/withTimeout";
import { getFollowStatus } from "@/actions/social.actions";

const PROFILE_QUERIES = process.env.NODE_ENV === "development";
import { notFound } from "next/navigation";
import { FollowButton } from "@/features/social/FollowButton";
import { FavoritesGrid } from "@/features/user/FavoritesGrid";
import { FeedCard } from "@/components/shared/FeedCard";
import { MediaCard } from "@/components/shared/MediaCard";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { ProfileHeaderSkeleton } from "@/components/skeletons/ProfileHeaderSkeleton";
import { ReviewsTabSkeleton } from "@/components/skeletons/ReviewsTabSkeleton";
import { ListsTabSkeleton } from "@/components/skeletons/ListsTabSkeleton";
import { Rss, Film, List as ListIcon, Bookmark, Star } from "lucide-react";
import { getCachedUserPreferences } from "@/lib/recommendations/analyzePreferences";

export const dynamic = "force-dynamic";

function renderStars(rating: number | null): string {
  if (rating === null || rating === undefined || rating === 0) return "";
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? "½" : "";
  return "★".repeat(fullStars) + halfStar;
}

// ─── TAB COMPONENTS ────────────────────────────────────────────────────────

// 1. Reviews Tab Component
async function ReviewsTab({ uid }: { uid: string }) {
  try {
    const reviewsSnap = await withTimeout(
      adminDb
        .collection("reviews")
        .where("userId", "==", uid)
        .get(),
      5000
    );

    const rawReviews = reviewsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Sort in-memory to prevent index requirements
    rawReviews.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

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
    const listsSnap = await withTimeout(
      adminDb
        .collection("lists")
        .where("ownerId", "==", uid)
        .get(),
      5000
    );

    const rawLists = listsSnap.docs.map((doc) => doc.data()) as any[];
    
    const lists = rawLists
      .filter((l) => l.visibility === "public")
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

    if (lists.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-500 font-medium select-none bg-card/10 border border-white/5 rounded-xl">
          <p className="font-bold text-white text-base flex items-center justify-center gap-1.5">
            <span>📚</span> No lists available.
          </p>
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
              <div className="border border-zinc-800/80 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between h-36 transition-all group">
                <div className="flex items-center pl-2 relative h-16">
                  {posters.map((poster: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative h-16 aspect-[2/3] rounded-md overflow-hidden border border-black/50 shadow-xl -ml-2 transition-transform group-hover:translate-x-1.5 duration-200"
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

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-white/5">
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
    const activitiesSnap = await withTimeout(
      adminDb
        .collection("activities")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(15)
        .get(),
      5000
    );

    const rawActivities = activitiesSnap.docs
      .map((doc) => {
        const data = doc.data();
        let normalizedType = data.type;
        if (data.type === "watch" || data.type === "rate") {
          normalizedType = "watched";
        } else if (data.type === "review") {
          normalizedType = "reviewed";
        }

        const isoDateStr = data.createdAt?.toDate 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt instanceof Date 
              ? data.createdAt.toISOString() 
              : (data.createdAt?._seconds 
                  ? new Date(data.createdAt._seconds * 1000).toISOString() 
                  : new Date().toISOString()));

        return {
          id: doc.id,
          userId: data.userId || data.actorId || "",
          type: normalizedType,
          movieId: data.movieId || data.mediaId || null,
          tvId: data.tvId || null,
          rating: data.rating || null,
          reviewText: data.reviewText || null,
          containsSpoilers: data.containsSpoilers || data.hasSpoilers || false,
          createdAt: isoDateStr,
          listTitle: data.listTitle || null,
          listId: data.listId || null,
          activitySnapshot: data.activitySnapshot || null,
          mediaSnapshot: data.mediaSnapshot || null,
          commentsCount: data.commentsCount || 0,
          reactions: data.reactions || null,
          likesCount: data.likesCount || 0,
        };
      })
      .filter((act) => act.type && ["watched", "reviewed", "rewatched", "finished_series", "watchlist_added", "list_created"].includes(act.type));

    const slice = rawActivities.slice(0, 15);

    // ─── OPTIMIZATION: BATCH READ SAVED STATE (getAll) ────────────────────
    const trackingMap = new Map<string, any>();
    if (session) {
      const trackingRefs = slice
        .map((act) => {
          const mediaId = act.movieId || act.tvId;
          return mediaId ? adminDb.collection("watchTracking").doc(`${session.uid}_${mediaId}`) : null;
        })
        .filter(Boolean) as FirebaseFirestore.DocumentReference[];

      const trackingDocs = trackingRefs.length > 0 ? await adminDb.getAll(...trackingRefs) : [];
      trackingDocs.forEach((doc) => {
        if (doc.exists) {
          trackingMap.set(doc.id, doc.data());
        }
      });
    }

    // ─── OPTIMIZATION: BATCH READ USER REACTIONS (getAll) ──────────────────
    const userReactionMap = new Map<string, string>();
    if (session) {
      const reactionRefs = slice.map((act) =>
        adminDb.collection("activities").doc(act.id).collection("reactions").doc(session.uid)
      );

      const userReactionDocs = await adminDb.getAll(...reactionRefs);
      userReactionDocs.forEach((doc) => {
        if (doc.exists) {
          const activityId = doc.ref.parent.parent?.id;
          if (activityId) {
            userReactionMap.set(activityId, doc.data()?.type);
          }
        }
      });
    }

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
    const watchlistSnap = await withTimeout(
      adminDb
        .collection("watchlist")
        .where("userId", "==", uid)
        .get(),
      5000
    );

    const rawWatchlist = watchlistSnap.docs.map((doc) => doc.data()) as any[];

    // Sort in memory by addedAt desc
    rawWatchlist.sort((a, b) => {
      const timeA = a.addedAt?.toDate ? a.addedAt.toDate().getTime() : new Date(a.addedAt).getTime();
      const timeB = b.addedAt?.toDate ? b.addedAt.toDate().getTime() : new Date(b.addedAt).getTime();
      return timeB - timeA;
    });

    const items = await Promise.all(
      rawWatchlist.slice(0, 24).map(async (item) => {
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-[#E94560]/10 text-primary border border-[#E94560]/15 shadow-sm"
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
  const { tab = "reviews" } = await searchParams;
  const usernameLower = username.toLowerCase();

  // 1. Fetch UID from username
  const usernameDoc = await adminDb.collection("usernames").doc(usernameLower).get();
  if (!usernameDoc.exists) {
    notFound();
  }
  const { uid } = usernameDoc.data() as { uid: string };

  // 2. Fetch User document
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    notFound();
  }
  const userData = userDoc.data()!;

  // 3. Parallel fetch of count statistics
  const [
    followersSnap,
    followingSnap,
    reviewsSnap,
    watchlistSnap,
    listsSnap,
    session,
  ] = await Promise.all([
    adminDb.collection("users").doc(uid).collection("followers").count().get(),
    adminDb.collection("users").doc(uid).collection("following").count().get(),
    adminDb.collection("reviews").where("userId", "==", uid).count().get(),
    adminDb.collection("watchlist").where("userId", "==", uid).count().get(),
    adminDb.collection("lists").where("ownerId", "==", uid).where("visibility", "==", "public").count().get(),
    verifySession(),
  ]);

  const followersCount = followersSnap.data().count;
  const followingCount = followingSnap.data().count;
  const reviewsCount = reviewsSnap.data().count;
  const watchlistCount = watchlistSnap.data().count;
  const listsCount = listsSnap.data().count;

  const isOwnProfile = session?.uid === uid;
  const { isFollowing } = await getFollowStatus(uid);

  return (
    <div className="min-h-screen bg-[#09090F] pb-16">
      {/* BANNER */}
      <div 
        className="relative h-52 w-full overflow-hidden bg-[#09090F]"
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-10 mb-6 relative z-10">
          {/* AVATAR */}
          <div className="relative h-24 w-24 shrink-0 select-none -mt-12">
            <SafeAvatar
              src={userData.photoURL}
              alt={userData.displayName || "Avatar"}
              name={userData.displayName || "C"}
              size={96}
              className="border-4 border-[#09090F] shadow-2xl"
            />
          </div>

          {/* ACTION BUTTON */}
          <div className="select-none">
            {isOwnProfile ? (
              <Link href="/setup-profile">
                <Button variant="secondary" size="sm">
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <FollowButton
                targetUserId={uid}
                targetUsername={userData.username}
                initialIsFollowing={isFollowing}
              />
            )}
          </div>
        </div>

        {/* METADATA */}
        <div className="space-y-2 mt-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight font-display">
              {userData.displayName}
            </h1>
            <p className="text-zinc-500 text-sm font-bold">
              @{userData.username}
            </p>
          </div>
          {userData.accountType && (
            <div className="pt-1 select-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/5 text-zinc-200 border border-white/5">
                {userData.accountType === "viewer" && "🎬 Viewer"}
                {userData.accountType === "reviewer" && "⭐ Reviewer"}
                {userData.accountType === "curator" && "📚 Curator"}
                {userData.accountType === "creator" && "🎥 Creator"}
              </span>
            </div>
          )}
          {userData.bio && (
            <p className="text-sm text-zinc-300 mt-2 max-w-md leading-relaxed whitespace-pre-wrap">
              {userData.bio}
            </p>
          )}

          {/* Favorite Genre Badge */}
          {userData.favoriteGenre && (
            <div className="pt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-[#E94560]/20 tracking-wider font-display">
                {userData.favoriteGenre}
              </span>
            </div>
          )}

          {/* Favorite Movie Autocomplete */}
          {userData.favoriteMovie && (
            <div className="mt-4 p-3 cine-glass rounded-xl flex items-center gap-3.5 max-w-xs shadow-md">
              <div className="relative w-[40px] h-[60px] rounded overflow-hidden bg-[#101018] border border-white/5 shrink-0">
                {userData.favoriteMovie.posterPath ? (
                  <Image 
                    src={`https://image.tmdb.org/t/p/w185${userData.favoriteMovie.posterPath}`}
                    alt={userData.favoriteMovie.title}
                    fill
                    sizes="40px"
                    className="object-cover"
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

          {/* Favorite Genres (Affinity) */}
          <Suspense fallback={<div className="h-10 w-48 rounded bg-zinc-800/20 animate-pulse mt-4" />}>
            <FavoriteGenres uid={uid} />
          </Suspense>
        </div>

        {/* STATS ROW (Glass chips) */}
        <div className="flex flex-wrap items-center gap-3 py-4 mt-6 border-y border-white/5 select-none font-display">
          <Link href={`/u/${username}?tab=activity`}>
            <div className={cn("px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm",
              tab === "activity" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-[13px]">{followersCount}</span> Followers
            </div>
          </Link>

          <Link href={`/u/${username}?tab=activity`}>
            <div className={cn("px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm",
              tab === "activity" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-[13px]">{followingCount}</span> Following
            </div>
          </Link>

          <Link href={`/u/${username}?tab=reviews`}>
            <div className={cn("px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm",
              tab === "reviews" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-[13px]">{reviewsCount}</span> Reviews
            </div>
          </Link>

          <Link href={`/u/${username}?tab=watchlist`}>
            <div className={cn("px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm",
              tab === "watchlist" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-[13px]">{watchlistCount}</span> Watched
            </div>
          </Link>

          <Link href={`/u/${username}?tab=lists`}>
            <div className={cn("px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm",
              tab === "lists" ? "bg-white/10 text-white border-white/20" : "bg-white/3 text-[#A1A1AA] border-white/5 hover:text-white hover:bg-white/8"
            )}>
              <span className="font-black text-white text-[13px]">{listsCount}</span> Lists
            </div>
          </Link>
        </div>

        {/* TAB BAR */}
        <div className="flex border-b border-white/5 mt-6 select-none overflow-x-auto scrollbar-none font-display">
          {["reviews", "lists", "activity", "watchlist", "favorites"].map((t) => {
            const isActive = tab === t;
            return (
              <Link
                key={t}
                href={`/u/${username}?tab=${t}`}
                scroll={false}
                className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 shrink-0 ${
                  isActive
                    ? "border-[#E94560] text-white"
                    : "border-transparent text-[#A1A1AA] hover:text-white"
                }`}
              >
                {t}
              </Link>
            );
          })}
        </div>

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
        </div>
      </div>
    </div>
  );
}

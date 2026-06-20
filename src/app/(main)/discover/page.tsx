import {
  getTrending,
  getTopRated,
  getIndianCinemaTrending,
  getAnimeSpotlight,
  getHiddenGems,
  getMovieDetails,
  getTVDetails,
} from "@/lib/tmdb/client";
import { adminDb } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/withTimeout";
import { Suspense } from "react";
import Link from "next/link";
import { SuggestedUsers } from "@/components/shared/SuggestedUsers";
import SimilarTasteUsers from "@/components/shared/SimilarTasteUsers";
import { HeroBanner } from "@/components/shared/HeroBanner";
import { CarouselSection } from "@/components/shared/CarouselSection";
import { CommunityReviews } from "@/components/shared/CommunityReviews";
import { CommunityActivity } from "@/components/shared/CommunityActivity";
import { CommunityLists } from "@/components/shared/CommunityLists";
import { ConnectionErrorBanner } from "@/components/shared/ConnectionErrorBanner";
import { TrendingTopics } from "@/components/shared/TrendingTopics";
import { HomeReviewsSkeleton } from "@/components/skeletons/HomeReviewsSkeleton";
import { HomeListsSkeleton } from "@/components/skeletons/HomeListsSkeleton";
import { PageTransition } from "@/components/shared/PageTransition";
import { WeeklyChallenge, PopularClubs, MostActiveMembers } from "@/components/shared/DiscoverPlaceholders";

import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { verifySession } from "@/actions/auth.actions";

export default async function DiscoverPage() {
  const session = await verifySession();
  
  const [
    trendingMovies,
    trendingTV,
    topRated,
    tollywood,
    kollywood,
    mollywood,
    bollywood,
    anime,
    hiddenGems,
  ] = await Promise.all([
    getTrending("movie", "week"),
    getTrending("tv", "week"),
    getTopRated("movie"),
    getIndianCinemaTrending("te"),
    getIndianCinemaTrending("ta"),
    getIndianCinemaTrending("ml"),
    getIndianCinemaTrending("hi"),
    getAnimeSpotlight(),
    getHiddenGems(),
  ]);

  // ─── Fetch Community Popular from Firestore ──────────────────────────────
  let communityPopular: any[] = [];
  try {
    const trackingSnap = await withTimeout(
      adminDb
        .collection("watchTracking")
        .orderBy("watchDate", "desc")
        .limit(10)
        .get(),
      5000
    );

    const uniqueIds = new Set<string>();
    const fetchPromises: Promise<any>[] = [];

    trackingSnap.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.mediaType}_${data.mediaId}`;
      if (!uniqueIds.has(key)) {
        uniqueIds.add(key);
        if (data.mediaType === "tv") {
          fetchPromises.push(getTVDetails(data.mediaId).catch(() => null));
        } else {
          fetchPromises.push(getMovieDetails(data.mediaId).catch(() => null));
        }
      }
    });

    const resolved = await Promise.all(fetchPromises);
    communityPopular = resolved.filter(Boolean).map((item) => ({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      genre_ids: item.genres?.map((g: any) => g.id) || [],
      media_type: item.first_air_date ? "tv" : "movie",
    }));
  } catch (err) {
    console.warn("Error fetching community popular:", err);
  }

  // Supplement if community popular is empty or small
  const recentlyPopular =
    communityPopular.length >= 4
      ? communityPopular
      : [...communityPopular, ...(trendingMovies?.results || [])].slice(0, 8);

  const isBlocked =
    !trendingMovies &&
    !trendingTV &&
    !tollywood &&
    !kollywood &&
    !mollywood &&
    !bollywood;

  const heroItems = trendingMovies?.results || trendingTV?.results || [];

  return (
    <PageTransition>
      <PullToRefresh>
        <div className="px-5 lg:px-8 py-6 lg:py-8 space-y-8 page-enter">
          {/* Blocked Connection Warning Banner */}
          {isBlocked && <ConnectionErrorBanner />}

          <div className="space-y-3 select-none mb-8">
            <h1 className="text-[32px] md:text-[40px] font-black tracking-tight text-white leading-none uppercase font-display">
              Discover
            </h1>
            <p className="text-[14px] text-muted-foreground max-w-xl leading-relaxed">
              Explore trending films, hidden gems, and community favorites.
            </p>
          </div>

          {/* Content Stream (High Density 1-Column) */}
          <div className="flex flex-col gap-10 max-w-4xl mx-auto">
            {/* 1. Weekly Challenge */}
            <WeeklyChallenge />

            {/* 2. Trending Reviews */}
            <Suspense fallback={<HomeReviewsSkeleton />}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                  <h2 className="text-[18px] font-bold tracking-tight text-white uppercase">Trending Reviews</h2>
                </div>
                <CommunityReviews />
              </div>
            </Suspense>

            {/* 3. Trending Users */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                <h2 className="text-[18px] font-bold tracking-tight text-white uppercase">Trending Users</h2>
              </div>
              <SuggestedUsers />
            </div>

            {/* 4. Trending Hashtags */}
            <TrendingTopics />

            {/* 5. Popular Clubs */}
            <PopularClubs />

            {/* 6. Similar Taste Users */}
            {session && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                  <h2 className="text-[18px] font-bold tracking-tight text-white uppercase">Similar Taste Users</h2>
                </div>
                <SimilarTasteUsers uid={session.uid} limit={6} />
              </div>
            )}

            {/* 7. Hidden Gems */}
            <CarouselSection
              title="Hidden Gems"
              data={hiddenGems?.results || null}
              mediaType="movie"
              iconName="gem"
              layout="wide"
              slug="hidden-gems"
            />

            {/* 8. Most Active Members */}
            <MostActiveMembers />

            {/* --- OTHER SECTIONS --- */}
            <div className="pt-10 border-t border-white/5 space-y-10">
              <CarouselSection
                title="Popular with Cinephiles"
                data={recentlyPopular}
                mediaType="movie"
                iconName="users"
                layout="standard"
                slug="popular"
              />

              <CarouselSection
                title="Trending Worldwide"
                data={trendingMovies?.results || null}
                mediaType="movie"
                iconName="globe"
                layout="large"
                slug="trending"
              />

              <CarouselSection
                title="Trending TV Shows"
                data={trendingTV?.results || null}
                mediaType="tv"
                iconName="tv"
                layout="standard"
                slug="trending-tv"
              />

              <CarouselSection
                title="Top Rated This Week"
                data={topRated?.results || null}
                mediaType="movie"
                iconName="trophy"
                layout="standard"
                slug="top-rated"
              />

              <CarouselSection
                title="Anime Spotlight"
                data={anime?.results || null}
                mediaType="tv"
                iconName="sparkles"
                layout="dense"
                slug="anime"
              />
            </div>
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}

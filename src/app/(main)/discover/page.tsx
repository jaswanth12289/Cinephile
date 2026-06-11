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
import { Suspense } from "react";
import { HeroBanner } from "@/components/shared/HeroBanner";
import { CarouselSection } from "@/components/shared/CarouselSection";
import { CommunityReviews } from "@/components/shared/CommunityReviews";
import { CommunityActivity } from "@/components/shared/CommunityActivity";
import { CommunityLists } from "@/components/shared/CommunityLists";
import { ConnectionErrorBanner } from "@/components/shared/ConnectionErrorBanner";
import { HomeReviewsSkeleton } from "@/components/skeletons/HomeReviewsSkeleton";
import { HomeListsSkeleton } from "@/components/skeletons/HomeListsSkeleton";
import { PageTransition } from "@/components/shared/PageTransition";

export default async function DiscoverPage() {
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
    const trackingSnap = await adminDb
      .collection("watchTracking")
      .orderBy("watchDate", "desc")
      .limit(10)
      .get();

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
      <div className="container mx-auto px-4 py-4 space-y-6 pb-16 max-w-7xl">
        {/* Blocked Connection Warning Banner */}
        {isBlocked && <ConnectionErrorBanner />}

      {/* Manual Hero Banner */}
      {heroItems.length > 0 ? (
        <HeroBanner mediaList={heroItems} />
      ) : (
        <div className="w-full h-[400px] rounded-2xl border border-border/40 bg-card/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground font-bold">
            No Featured Banners Loaded
          </p>
        </div>
      )}

      {/* Content Stream (High Density) */}
      <div className="space-y-8">
        {/* Recently Popular strip right below Hero banner */}
        <CarouselSection
          title="Popular with Cinephiles"
          data={recentlyPopular}
          mediaType="movie"
          iconName="users"
          layout="standard"
        />

        <CarouselSection
          title="Trending Worldwide"
          data={trendingMovies?.results || null}
          mediaType="movie"
          iconName="globe"
          layout="large"
        />

        <CarouselSection
          title="Trending TV Shows"
          data={trendingTV?.results || null}
          mediaType="tv"
          iconName="tv"
          layout="standard"
        />

        <CarouselSection
          title="Top Rated This Week"
          data={topRated?.results || null}
          mediaType="movie"
          iconName="trophy"
          layout="standard"
        />

        {/* Popular Reviews (Integrated inline) */}
        <Suspense fallback={<HomeReviewsSkeleton />}>
          <CommunityReviews />
        </Suspense>

        <CarouselSection
          title="Trending Tollywood"
          data={tollywood?.results || null}
          mediaType="movie"
          iconName="flame"
          layout="standard"
        />

        <CarouselSection
          title="Trending Kollywood"
          data={kollywood?.results || null}
          mediaType="movie"
          iconName="film"
          layout="standard"
        />

        <CarouselSection
          title="Trending Mollywood"
          data={mollywood?.results || null}
          mediaType="movie"
          iconName="sparkles"
          layout="standard"
        />

        <CarouselSection
          title="Trending Bollywood"
          data={bollywood?.results || null}
          mediaType="movie"
          iconName="film"
          layout="standard"
        />

        {/* Curated Top Lists (Integrated inline) */}
        <Suspense fallback={<HomeListsSkeleton />}>
          <CommunityLists />
        </Suspense>

        <CarouselSection
          title="Anime Spotlight"
          data={anime?.results || null}
          mediaType="tv"
          iconName="sparkles"
          layout="dense"
        />

        <CarouselSection
          title="Hidden Gems"
          data={hiddenGems?.results || null}
          mediaType="movie"
          iconName="gem"
          layout="wide"
        />

        {/* Friend Activity Feed (Integrated inline) */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-card/25 border border-border/30 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <CommunityActivity />
        </Suspense>
      </div>
    </div>
  </PageTransition>
);
}

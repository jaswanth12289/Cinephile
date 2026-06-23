import Link from "next/link";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { getTrending, getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { verifySession } from "@/actions/auth.actions";
import { createServiceClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/withTimeout";
import { redirect } from "next/navigation";
import { getContinueWatching } from "@/actions/tracking.actions";
import { PageLoadMeasure } from "@/components/shared/PageLoadMeasure";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { CommunityReviews } from "@/components/shared/CommunityReviews";
import { HomeReviewsSkeleton } from "@/components/skeletons/HomeReviewsSkeleton";
import FriendActivityShelf from "@/components/shared/FriendActivityShelf";
import RecommendationsShelf from "@/components/shared/RecommendationsShelf";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await verifySession();
  let userData: any = null;

  if (session) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("profile_completed, display_name")
      .eq("id", session.id)
      .maybeSingle();
      
    if (data) {
      if (data.profile_completed === false) redirect("/setup-profile");
      userData = { displayName: data.display_name };
    }
  }

  const continueWatching = session ? (await getContinueWatching()).filter(Boolean) : [];

  // Trending movies
  const trendingRes = await getTrending("movie", "day").catch(() => null);
  const trendingMovies = trendingRes?.results || [];

  // Trending TV
  const trendingTVRes = await getTrending("tv", "week").catch(() => null);
  const trendingTV = trendingTVRes?.results || [];

  // Popular (community-based)
  let communityPopular: any[] = [];
  try {
    const supabase = createServiceClient();
    const { data: tracking } = await supabase
      .from("watch_tracking")
      .select("media_id, media_type")
      .order("updated_at", { ascending: false })
      .limit(10);
      
    const uniqueIds = new Set<string>();
    const fetchPromises: Promise<any>[] = [];
    
    (tracking || []).forEach((row) => {
      const key = `${row.media_type}_${row.media_id}`;
      if (!uniqueIds.has(key)) {
        uniqueIds.add(key);
        fetchPromises.push(
          row.media_type === "tv"
            ? getTVDetails(row.media_id).catch(() => null)
            : getMovieDetails(row.media_id).catch(() => null)
        );
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
  } catch {}

  const popularThisWeek =
    communityPopular.length >= 4
      ? communityPopular
      : [...communityPopular, ...trendingMovies].slice(0, 10);

  // Top rated
  const topRated = [...trendingMovies]
    .filter((m: any) => m.vote_average >= 7.5)
    .sort((a: any, b: any) => b.vote_average - a.vote_average)
    .slice(0, 12);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="main-with-sidebar pt-14 pb-24 lg:pt-0 lg:pb-0 min-h-screen text-white">
        <PullToRefresh>
          <div className="px-5 lg:px-8 py-6 lg:py-8 space-y-8 page-enter">

            {/* ── Welcome Header ── */}
            <div className="flex items-center justify-between">
              <div>
                {session && userData ? (
                  <>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{greeting()}</p>
                    <h1 className="text-xl font-bold text-white mt-0.5">
                      {userData.displayName || "Cinephile"} 👋
                    </h1>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Welcome to</p>
                    <h1 className="text-xl font-bold text-white mt-0.5">Cinephile</h1>
                  </>
                )}
              </div>
            </div>

            {/* 1. Continue Watching */}
            {continueWatching.length > 0 && (
              <HomeCarousel
                title="Continue Watching"
                seeAllHref="/watchlist"
                items={continueWatching}
                mediaType="movie"
                variant="continueWatching"
              />
            )}

            {/* 2. Friend Activity */}
            {session && <FriendActivityShelf uid={session.id} />}

            {/* 3. Recommended For You */}
            {session && (
              <Suspense fallback={<div className="h-40 animate-pulse bg-white/5 rounded-2xl mb-10" />}>
                <RecommendationsShelf uid={session.id} />
              </Suspense>
            )}

            {/* 4. Trending Among Friends (Trending Now) */}
            <HomeCarousel
              title="Trending Now"
              seeAllHref="/discover"
              items={trendingMovies.slice(0, 12)}
              mediaType="movie"
            />

            {/* 5. Popular This Week */}
            {communityPopular.length > 0 && (
              <HomeCarousel
                title="Popular with Cinephiles"
                seeAllHref="/discover"
                items={popularThisWeek}
                mediaType="movie"
              />
            )}

            {/* 6. Top Rated */}
            {topRated.length > 0 && (
              <HomeCarousel
                title="Top Rated Movies"
                seeAllHref="/discover?sort=top_rated"
                items={topRated}
                mediaType="movie"
              />
            )}

            {/* ── Community Reviews ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-white">Community Reviews</h2>
                <Link href="/feed" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  See all →
                </Link>
              </div>
              <Suspense fallback={<HomeReviewsSkeleton />}>
                <CommunityReviews />
              </Suspense>
            </div>

          </div>

          {/* Footer */}
          <footer className="px-5 lg:px-8 py-6 border-t border-white/[0.06] text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Cinephile — Your world of cinema.
          </footer>

          <PageLoadMeasure pageName="home" />
        </PullToRefresh>
      </div>
    </div>
  );
}

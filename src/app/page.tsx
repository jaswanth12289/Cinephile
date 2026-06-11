import Link from "next/link";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { getTrending, getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { CommunityReviews } from "@/components/shared/CommunityReviews";
import { CommunityActivity } from "@/components/shared/CommunityActivity";
import { HomeReviewsSkeleton } from "@/components/skeletons/HomeReviewsSkeleton";
import { verifySession } from "@/actions/auth.actions";
import { adminDb } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/withTimeout";
import { redirect } from "next/navigation";
import { CarouselSection } from "@/components/shared/CarouselSection";
import { HeroBanner } from "@/components/shared/HeroBanner";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

export const dynamic = "force-dynamic";

import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function HomePage() {
  const session = await verifySession();
  let userData: any = null;

  if (session) {
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.profileCompleted === false) {
        redirect("/setup-profile");
      }
      userData = data;
    }
  }

  // Fetch trending movies (cached/revalidated dynamically)
  const trendingResponse = await getTrending("movie", "day").catch(() => null);
  const trendingMovies = trendingResponse?.results || [];

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
    console.warn("Error fetching community popular on homepage:", err);
  }

  // Supplement if community popular is empty or small
  const recentlyPopular =
    communityPopular.length >= 4
      ? communityPopular
      : [...communityPopular, ...trendingMovies].slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white flex flex-col">
      <Navbar />

      <PullToRefresh>
        {/* Personalized Welcome Header / Dashboard Intro */}
        <div className="container mx-auto px-4 pt-4 sm:pt-6 select-none">
          {session && userData ? (
            <div className="flex items-center gap-3">
              <SafeAvatar
                src={userData.photoURL}
                alt={userData.displayName || "User"}
                name={userData.displayName || "U"}
                size={36}
                className="!h-9 !w-9 border-white/10"
              />
              <div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider leading-none">Welcome back</p>
                <h2 className="text-lg font-black text-white font-display mt-0.5 leading-none">
                  {userData.displayName || "Cinephile"}
                </h2>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-primary text-[10px] font-black uppercase tracking-wider leading-none font-display">Cinephile Spotlight</p>
              <h2 className="text-lg font-black text-white font-display mt-0.5 leading-none">
                Explore Cinema
              </h2>
            </div>
          )}
        </div>

        {/* Hero Spotlight Slider */}
        <div className="container mx-auto px-4 pt-4">
          <HeroBanner mediaList={trendingMovies} loading={false} />
        </div>

        {/* Main Content Area */}
        <main className="container mx-auto px-4 py-8 md:py-12 space-y-10 md:space-y-14">
          
          {/* Popular with Cinephiles */}
          <CarouselSection
            title="Popular with Cinephiles"
            data={recentlyPopular}
            mediaType="movie"
            iconName="users"
            layout="standard"
          />

          {/* Trending Worldwide */}
          <CarouselSection
            title="Trending Worldwide"
            data={trendingMovies.length > 0 ? trendingMovies.slice(0, 12) : null}
            mediaType="movie"
            iconName="globe"
            layout="large"
          />

          {/* Popular Reviews (Server Component) */}
          <Suspense fallback={<HomeReviewsSkeleton />}>
            <CommunityReviews />
          </Suspense>

          {/* Community Activity */}
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-card/25 border border-border/30 animate-pulse" />
                ))}
              </div>
            }
          >
            <CommunityActivity />
          </Suspense>

        </main>

        {/* Footer */}
        <footer className="mt-auto py-8 pb-32 md:pb-8 border-t border-white/5 text-center text-xs text-muted-foreground bg-black/20 select-none">
          <p>© {new Date().getFullYear()} Cinephile. Built for movie and TV enthusiasts.</p>
        </footer>
      </PullToRefresh>
    </div>
  );
}

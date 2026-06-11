import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
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

export const dynamic = "force-dynamic";

// IDs of premium classics for the hero collage — always shown for brand consistency
const COLLAGE_IDS = [
  { id: 157336, title: "Interstellar" },
  { id: 872585, title: "Oppenheimer" },
  { id: 693134, title: "Dune: Part Two" },
  { id: 155,    title: "The Dark Knight" },
  { id: 496243, title: "Parasite" },
];

import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function HomePage() {
  const session = await verifySession();
  if (session) {
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.profileCompleted === false) {
        redirect("/setup-profile");
      }
    }
  }

  // Fetch trending movies (cached/revalidated dynamically)
  const trendingResponse = await getTrending("movie", "day").catch(() => null);
  const trendingMovies = trendingResponse?.results || [];

  // Fetch premium classics for the collage (cached 24h by getMovieDetails)
  const collageMovies = await Promise.all(
    COLLAGE_IDS.map(({ id, title }) =>
      getMovieDetails(String(id))
        .then((d: any) => ({ id, title, poster_path: d?.poster_path ?? null }))
        .catch(() => ({ id, title, poster_path: null }))
    )
  );

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
        {/* Hero Section */}
        <section className="relative overflow-hidden py-10 md:py-16 border-b border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/35 via-background to-background">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#E94560_0%,_transparent_50%)] opacity-20 pointer-events-none" />
          
          {/* Subtle film grain overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}
          />

          {/* Cinematic gradient light beams */}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-90 pointer-events-none" />
          
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10">
            
            {/* Left Column: Headline, copy, CTAs */}
            <div className="md:col-span-7 space-y-6 md:space-y-8 text-center md:text-left select-none">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.15] uppercase font-display">
                Your cinema life, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-rose-500 to-[#D4AF37] animate-pulse">
                  all in one place.
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed">
                Track films, write reviews, build lists, and follow movie lovers around the world.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-2">
                <Link href="/register" className="w-full sm:w-auto" prefetch={true}>
                  <Button size="lg" className="w-full sm:w-auto shadow-lg">
                    Get Started
                  </Button>
                </Link>
                <Link href="/discover" className="w-full sm:w-auto" prefetch={true}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore Movies
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-semibold pt-1 select-none">
                <span>20K+ Reviews</span>
                <span className="text-zinc-700 hidden sm:inline">•</span>
                <span>Thousands of Lists</span>
                <span className="text-zinc-700 hidden sm:inline">•</span>
                <span>Growing Community</span>
              </div>
            </div>

            {/* Right Column: Premium overlapping collage of posters */}
            <div className="md:col-span-5 flex justify-center items-center">
              <div className="relative w-full h-[320px] sm:h-[400px] max-w-[420px] mx-auto select-none mt-8 md:mt-0">
                {collageMovies.map((movie: any, idx: number) => {
                  // Layout styling mapping based on index to create overlapping Letterboxd-like aesthetic
                  const layouts = [
                    // Back Left
                    "absolute top-12 left-0 w-[95px] sm:w-[120px] aspect-[2/3] rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/5 -rotate-12 z-10 transition-all hover:scale-[1.02] duration-300 hover:z-40",
                    // Back Right
                    "absolute top-12 right-0 w-[95px] sm:w-[120px] aspect-[2/3] rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/5 rotate-12 z-10 transition-all hover:scale-[1.02] duration-300 hover:z-40",
                    // Mid Left
                    "absolute top-6 left-12 sm:left-16 w-[105px] sm:w-[135px] aspect-[2/3] rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.7)] border border-white/10 -rotate-6 z-20 transition-all hover:scale-[1.02] duration-300 hover:z-40",
                    // Mid Right
                    "absolute top-6 right-12 sm:right-16 w-[105px] sm:w-[135px] aspect-[2/3] rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.7)] border border-white/10 rotate-6 z-20 transition-all hover:scale-[1.02] duration-300 hover:z-40",
                    // Front Center
                    "absolute top-0 left-1/2 -translate-x-1/2 w-[115px] sm:w-[150px] aspect-[2/3] rounded-xl shadow-[0_20px_45px_rgba(0,0,0,0.8)] border border-white/15 z-30 transition-all hover:scale-[1.02] hover:rotate-0 duration-300 hover:z-40"
                  ];

                  return (
                    <div key={movie.id} className={layouts[idx]}>
                      {movie.poster_path ? (
                        <div className="relative w-full h-full">
                          <Image 
                            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            sizes="(max-width: 640px) 120px, 150px"
                            priority
                            className="object-cover rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-xl bg-zinc-900 border border-white/10" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

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

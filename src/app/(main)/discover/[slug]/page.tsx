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
import { MediaCard } from "@/components/shared/MediaCard";
import { PageTransition } from "@/components/shared/PageTransition";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface DiscoverCategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchCategoryData(slug: string) {
  switch (slug) {
    case "trending": {
      const data = await getTrending("movie", "week");
      return { title: "Trending Worldwide", items: data?.results || [], mediaType: "movie" as const };
    }
    case "trending-tv": {
      const data = await getTrending("tv", "week");
      return { title: "Trending TV Shows", items: data?.results || [], mediaType: "tv" as const };
    }
    case "top-rated": {
      const data = await getTopRated("movie");
      return { title: "Top Rated Movies", items: data?.results || [], mediaType: "movie" as const };
    }
    case "telugu": {
      const data = await getIndianCinemaTrending("te");
      return { title: "Trending Tollywood", items: data?.results || [], mediaType: "movie" as const };
    }
    case "tamil": {
      const data = await getIndianCinemaTrending("ta");
      return { title: "Trending Kollywood", items: data?.results || [], mediaType: "movie" as const };
    }
    case "malayalam": {
      const data = await getIndianCinemaTrending("ml");
      return { title: "Trending Mollywood", items: data?.results || [], mediaType: "movie" as const };
    }
    case "hindi": {
      const data = await getIndianCinemaTrending("hi");
      return { title: "Trending Bollywood", items: data?.results || [], mediaType: "movie" as const };
    }
    case "anime": {
      const data = await getAnimeSpotlight();
      return { title: "Anime Spotlight", items: data?.results || [], mediaType: "tv" as const };
    }
    case "hidden-gems": {
      const data = await getHiddenGems();
      return { title: "Hidden Gems", items: data?.results || [], mediaType: "movie" as const };
    }
    case "popular": {
      let communityPopular: any[] = [];
      try {
        const trackingSnap = await withTimeout(
          adminDb
            .collection("watchTracking")
            .orderBy("watchDate", "desc")
            .limit(20)
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
      return { title: "Popular with Cinephiles", items: communityPopular, mediaType: "movie" as const };
    }
    default:
      return null;
  }
}

export default async function DiscoverCategoryPage({ params }: DiscoverCategoryPageProps) {
  const { slug } = await params;
  const data = await fetchCategoryData(slug);

  if (!data) notFound();

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#09090F] py-8 pb-16 text-white select-none">
        <div className="max-w-[1440px] mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <Link 
              href="/discover"
              className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display uppercase leading-tight">
                {data.title}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Explore the top trending lists curated from TMDB and the community
              </p>
            </div>
          </div>

          {/* Grid */}
          {data.items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No items found in this shelf.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-2">
              {data.items.map((item: any) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  title={item.title || item.name}
                  posterPath={item.poster_path}
                  mediaType={item.media_type || data.mediaType}
                  rating={item.vote_average}
                  releaseDate={item.release_date || item.first_air_date}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

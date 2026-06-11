import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

export const genreMap: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Doc",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

interface UserPreferenceData {
  topGenres: { id: number; name: string; count: number }[];
  topRatedMovies: { id: string; mediaType: "movie" | "tv"; title: string; rating: number }[];
  favoriteMovie: { tmdbId: number; title: string; posterPath: string } | null;
  favoriteGenre: string | null;
}

// Internal uncached analyzer function
async function analyzeUserPreferencesRaw(uid: string): Promise<UserPreferenceData> {
  try {
    // 1. Fetch user doc for favoriteMovie and favoriteGenre
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const favoriteMovie = userData?.favoriteMovie || null;
    const favoriteGenre = userData?.favoriteGenre || null;

    // 2. Fetch reviews (limit/sort in-memory for index-safety)
    const reviewsSnap = await adminDb
      .collection("reviews")
      .where("userId", "==", uid)
      .get();
    
    const highRatedReviews = reviewsSnap.docs
      .map(doc => doc.data())
      .filter(data => data.rating && data.rating >= 4);

    // 3. Fetch watched history (status === "watched")
    const watchSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .get();

    const watchedHistory = watchSnap.docs
      .map(doc => doc.data())
      .filter(data => data.status === "watched");

    // Sort watched history in memory desc by watchDate
    watchedHistory.sort((a, b) => {
      const timeA = a.watchDate?.toDate ? a.watchDate.toDate().getTime() : new Date(a.watchDate || 0).getTime();
      const timeB = b.watchDate?.toDate ? b.watchDate.toDate().getTime() : new Date(b.watchDate || 0).getTime();
      return timeB - timeA;
    });
    const topWatched = watchedHistory.slice(0, 10);

    // Gather all media items to analyze genres
    const mediaItems = [
      ...highRatedReviews.map(r => ({ id: r.mediaId, mediaType: r.mediaType || "movie", rating: r.rating })),
      ...topWatched.map(w => ({ id: w.mediaId, mediaType: w.mediaType || "movie", rating: null as number | null }))
    ];

    // Deduplicate
    const uniqueMediaItemsMap = new Map<string, typeof mediaItems[0]>();
    mediaItems.forEach(item => {
      if (item.id) {
        uniqueMediaItemsMap.set(item.id, item);
      }
    });
    const uniqueMediaItems = Array.from(uniqueMediaItemsMap.values());

    const genreCounts: Record<number, number> = {};
    const topRatedMoviesList: { id: string; mediaType: "movie" | "tv"; title: string; rating: number }[] = [];

    // Fetch TMDB details in parallel with revalidate caching
    await Promise.all(
      uniqueMediaItems.map(async (item) => {
        try {
          // Check if genreIds are already in watchTracking document or review
          if (item.id) {
            let details = null;
            if (item.mediaType === "tv") {
              details = await getTVDetails(item.id).catch(() => null);
            } else {
              details = await getMovieDetails(item.id).catch(() => null);
            }

            if (details) {
              const genres = details.genres || [];
              genres.forEach((g: any) => {
                if (g.id) {
                  genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
                }
              });

              if (item.rating && item.rating >= 4) {
                topRatedMoviesList.push({
                  id: item.id,
                  mediaType: item.mediaType as "movie" | "tv",
                  title: details.title || details.name,
                  rating: item.rating
                });
              }
            }
          }
        } catch (e) {
          console.warn(`[analyzeUserPreferences] failed to resolve media metadata for ${item.id}:`, e);
        }
      })
    );

    const topGenres = Object.entries(genreCounts)
      .map(([idStr, count]) => {
        const id = Number(idStr);
        return {
          id,
          name: genreMap[id] || "Unknown",
          count
        };
      })
      .sort((a, b) => b.count - a.count);

    topRatedMoviesList.sort((a, b) => b.rating - a.rating);

    return {
      topGenres,
      topRatedMovies: topRatedMoviesList,
      favoriteMovie,
      favoriteGenre
    };
  } catch (error) {
    console.warn("analyzeUserPreferencesRaw error:", error);
    return {
      topGenres: [],
      topRatedMovies: [],
      favoriteMovie: null,
      favoriteGenre: null
    };
  }
}

// Export the cached analyzer function
export function getCachedUserPreferences(uid: string): Promise<UserPreferenceData> {
  return unstable_cache(
    async () => {
      return await analyzeUserPreferencesRaw(uid);
    },
    ["user-preferences", uid],
    {
      revalidate: 21600,
      tags: ["user-preferences", uid]
    }
  )();
}

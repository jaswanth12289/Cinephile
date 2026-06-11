import { adminDb } from "@/lib/firebase/admin";
import { 
  getMovieRecommendations, 
  getSimilarMovies, 
  getDiscoverMovies, 
  getTrending 
} from "@/lib/tmdb/client";
import { getCachedUserPreferences, genreMap } from "./analyzePreferences";

export interface RecommendedMovie {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  reason: string;
}

export async function getRecommendations(uid: string): Promise<RecommendedMovie[]> {
  try {
    // 1. Fetch user preferences (cached for 6 hours)
    const preferences = await getCachedUserPreferences(uid);

    // 2. Gather rated & watched movie IDs to exclude them
    const reviewsSnap = await adminDb
      .collection("reviews")
      .where("userId", "==", uid)
      .get();
    
    const watchSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .get();

    const excludeIds = new Set<number>();
    
    // Add all rated items
    reviewsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.mediaId) {
        excludeIds.add(Number(data.mediaId));
      }
    });

    // Add all watched/tracked items
    watchSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.mediaId) {
        excludeIds.add(Number(data.mediaId));
      }
    });

    // Add favorite movie
    if (preferences.favoriteMovie?.tmdbId) {
      excludeIds.add(Number(preferences.favoriteMovie.tmdbId));
    }

    // 3. Fetch Recommendations from 4 Sources in parallel
    const sourceAPromise = (async () => {
      const lovedMovie = preferences.topRatedMovies[0];
      if (lovedMovie) {
        const res = await getMovieRecommendations(lovedMovie.id);
        const results = res?.results || [];
        return results.map((movie: any) => ({
          ...movie,
          reason: `Because you loved ${lovedMovie.title}`
        }));
      }
      return [];
    })();

    const sourceBPromise = (async () => {
      const favMovie = preferences.favoriteMovie;
      if (favMovie?.tmdbId) {
        const res = await getSimilarMovies(favMovie.tmdbId);
        const results = res?.results || [];
        return results.map((movie: any) => ({
          ...movie,
          reason: `Inspired by your favorite movie`
        }));
      }
      return [];
    })();

    const sourceCPromise = (async () => {
      const favGenreName = preferences.favoriteGenre || preferences.topGenres[0]?.name;
      if (favGenreName) {
        // Find genre ID from genreMap
        const genreId = Object.keys(genreMap).find(
          (key) => genreMap[Number(key)].toLowerCase() === favGenreName.toLowerCase()
        );
        if (genreId) {
          const res = await getDiscoverMovies({ with_genres: genreId.toString() });
          const results = res?.results || [];
          return results.map((movie: any) => ({
            ...movie,
            reason: `Because you love ${favGenreName}`
          }));
        }
      }
      return [];
    })();

    const sourceDPromise = (async () => {
      const res = await getTrending("movie", "day");
      const results = res?.results || [];
      return results.map((movie: any) => ({
        ...movie,
        reason: `Popular among Cinephiles`
      }));
    })();

    const [sourceA, sourceB, sourceC, sourceD] = await Promise.all([
      sourceAPromise,
      sourceBPromise,
      sourceCPromise,
      sourceDPromise
    ]);

    // 4. Merge using Round-Robin diversity
    const recommended: RecommendedMovie[] = [];
    const recommendedIds = new Set<number>();

    const sources = [sourceA, sourceB, sourceC, sourceD];
    let hasMore = true;
    let index = 0;

    while (recommended.length < 8 && hasMore) {
      hasMore = false;
      for (const source of sources) {
        if (index < source.length) {
          const movie = source[index];
          const movieId = Number(movie.id);
          
          if (!excludeIds.has(movieId) && !recommendedIds.has(movieId)) {
            recommended.push({
              id: movieId,
              title: movie.title || movie.name || "Unknown Movie",
              posterPath: movie.poster_path || null,
              backdropPath: movie.backdrop_path || null,
              voteAverage: movie.vote_average || 0,
              releaseDate: movie.release_date || movie.first_air_date || "",
              reason: movie.reason
            });
            recommendedIds.add(movieId);
            if (recommended.length === 8) break;
          }
          hasMore = true;
        }
      }
      index++;
    }

    return recommended;
  } catch (error) {
    console.warn("getRecommendations error:", error);
    return [];
  }
}

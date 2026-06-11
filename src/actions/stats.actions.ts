"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

/**
 * Computes general statistics for a user profile page.
 */
export async function getUserStats(uid: string) {
  try {
    // 1. Movies Watched
    const moviesSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .where("status", "==", "watched")
      .where("mediaType", "==", "movie")
      .get();
    
    const moviesCount = moviesSnap.size;

    // 2. TV Completed
    const tvSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .where("status", "==", "watched")
      .where("mediaType", "==", "tv")
      .get();
    
    const tvCount = tvSnap.size;

    // 3. Average Rating from Reviews
    const reviewsSnap = await adminDb
      .collection("reviews")
      .where("userId", "==", uid)
      .get();
    
    let totalRating = 0;
    const reviewsCount = reviewsSnap.size;
    reviewsSnap.docs.forEach((doc) => {
      totalRating += doc.data().rating || 0;
    });
    const avgRating = reviewsCount > 0 ? (totalRating / reviewsCount).toFixed(1) : "0.0";

    // 4. Calculate Hours Watched (Average movie = 2h, TV show completion = 10h)
    const hoursCount = (moviesCount * 2) + (tvCount * 10);

    // 5. Determine Favorite Genre from Top 4 Favorites
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const favorites = userData?.favorites || [];
    
    let favoriteGenre = "Drama"; // Default fallback
    let genresMap: Record<string, number> = {};

    // Parallel fetch genres for pinned favorites
    await Promise.all(
      favorites.map(async (fav: any) => {
        if (!fav) return;
        try {
          const details = fav.mediaType === "tv"
            ? await getTVDetails(fav.tmdbId).catch(() => null)
            : await getMovieDetails(fav.tmdbId).catch(() => null);
          if (details && details.genres) {
            details.genres.forEach((g: any) => {
              genresMap[g.name] = (genresMap[g.name] || 0) + 1;
            });
          }
        } catch (e) {
          // ignore
        }
      })
    );

    let maxGenreCount = 0;
    Object.entries(genresMap).forEach(([genre, count]) => {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        favoriteGenre = genre;
      }
    });

    // 6. Calculate Longest Streak (Consecutive days of logging watches)
    const allWatchedDates = [
      ...moviesSnap.docs.map(doc => doc.data().watchDate),
      ...tvSnap.docs.map(doc => doc.data().watchDate)
    ]
      .map(date => {
        const d = date?.toDate ? date.toDate() : new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
      .sort((a, b) => b - a); // Sort descending

    const uniqueDates = Array.from(new Set(allWatchedDates));
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (uniqueDates.length > 0) {
      tempStreak = 1;
      longestStreak = 1;
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const diff = uniqueDates[i] - uniqueDates[i + 1];
        if (diff === oneDayMs) {
          tempStreak++;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else if (diff > oneDayMs) {
          tempStreak = 1;
        }
      }
      
      const today = new Date();
      const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffWithLatest = todayTime - uniqueDates[0];
      if (diffWithLatest <= oneDayMs) {
        currentStreak = tempStreak;
      }
    }

    return {
      moviesCount,
      tvCount,
      hoursCount,
      avgRating,
      favoriteGenre,
      longestStreak,
      currentStreak,
    };
  } catch (error) {
    console.warn("getUserStats error:", error);
    return {
      moviesCount: 0,
      tvCount: 0,
      hoursCount: 0,
      avgRating: "0.0",
      favoriteGenre: "Drama",
      longestStreak: 0,
      currentStreak: 0,
    };
  }
}

/**
 * Computes weekly watch summaries for the WeeklyWrapped Card timeline display.
 */
export async function getWeeklyWrapped(uid: string) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Query movies/TV completed inside the last 7 days
    const trackingSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .where("status", "==", "watched")
      .where("watchDate", ">=", oneWeekAgo)
      .get();

    const moviesWatched = trackingSnap.docs.filter(doc => doc.data().mediaType === "movie").length;
    const tvWatched = trackingSnap.docs.filter(doc => doc.data().mediaType === "tv").length;
    const totalWatched = trackingSnap.size;

    if (totalWatched === 0) return null; // No weekly wrapped card if user watched nothing

    const hoursSpent = (moviesWatched * 2) + (tvWatched * 10);

    // Reviews submitted in the last 7 days
    const reviewsSnap = await adminDb
      .collection("reviews")
      .where("userId", "==", uid)
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    let totalRating = 0;
    const reviewsCount = reviewsSnap.size;
    reviewsSnap.docs.forEach((doc) => {
      totalRating += doc.data().rating || 0;
    });
    const avgRating = reviewsCount > 0 ? (totalRating / reviewsCount).toFixed(1) : "0.0";

    // Grab first genre of their latest watched movie this week as favorite genre
    let favoriteGenre = "Sci-Fi";
    if (trackingSnap.docs.length > 0) {
      const firstWatch = trackingSnap.docs[0].data();
      try {
        const details = firstWatch.mediaType === "tv"
          ? await getTVDetails(firstWatch.mediaId).catch(() => null)
          : await getMovieDetails(firstWatch.mediaId).catch(() => null);
        if (details && details.genres && details.genres.length > 0) {
          favoriteGenre = details.genres[0].name;
        }
      } catch (e) {
        // ignore
      }
    }

    return {
      moviesWatched,
      tvWatched,
      hoursSpent,
      avgRating,
      favoriteGenre,
    };
  } catch (error: any) {
    console.warn("[Weekly Wrapped Index Notification] A composite index is required for this query:", error.message);
    let indexErrorLink: string | null = null;
    if (error.message && error.message.includes("https://console.firebase.google.com")) {
      const match = error.message.match(/https:\/\/console\.firebase\.google\.com\S+/);
      if (match) {
        indexErrorLink = match[0];
      }
    }
    if (indexErrorLink) {
      return { error: true, indexErrorLink } as any;
    }
    return null;
  }
}



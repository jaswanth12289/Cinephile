"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

import { FieldValue } from "firebase-admin/firestore";

/**
 * Computes general statistics for a user profile page.
 * Uses cached data from users/{uid}/stats to avoid massive O(N) reads.
 */
export async function getUserStats(uid: string) {
  try {
    const statsDoc = await adminDb.collection("users").doc(uid).collection("stats").doc("summary").get();
    
    if (!statsDoc.exists) {
      return {
        moviesCount: 0,
        tvCount: 0,
        hoursCount: 0,
        avgRating: "0.0",
        favoriteGenre: "Drama",
        longestStreak: 0,
        currentStreak: 0,
        favoriteDecade: "2020s",
        favoriteLanguage: "en",
        topActor: "Unknown",
        topDirector: "Unknown"
      };
    }

    const data = statsDoc.data()!;
    return {
      moviesCount: data.moviesWatched || 0,
      tvCount: data.tvWatched || 0,
      hoursCount: data.totalHours || 0,
      avgRating: data.averageRating ? data.averageRating.toFixed(1) : "0.0",
      favoriteGenre: data.favoriteGenre || "Drama",
      longestStreak: data.longestStreak || 0,
      currentStreak: data.currentStreak || 0,
      favoriteDecade: data.favoriteDecade || "2020s",
      favoriteLanguage: data.favoriteLanguage || "en",
      topActor: data.topActor || "Unknown",
      topDirector: data.topDirector || "Unknown"
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
      favoriteDecade: "2020s",
      favoriteLanguage: "en",
      topActor: "Unknown",
      topDirector: "Unknown"
    };
  }
}

/**
 * Incrementally updates user stats.
 * Called when a new activity (watch, review, list) is created.
 */
export async function updateIncrementalStats(uid: string, eventType: "watch" | "review", payload: any) {
  try {
    const statsRef = adminDb.collection("users").doc(uid).collection("stats").doc("summary");
    
    if (eventType === "watch") {
      const { mediaType, hours = 2 } = payload;
      
      const updateData: any = {
        totalHours: FieldValue.increment(hours)
      };

      if (mediaType === "movie") {
        updateData.moviesWatched = FieldValue.increment(1);
      } else if (mediaType === "tv") {
        updateData.tvWatched = FieldValue.increment(1);
      }

      await statsRef.set(updateData, { merge: true });
    }
    
    if (eventType === "review") {
      const { rating } = payload;
      // Fetch current stats to recalculate running average
      const doc = await statsRef.get();
      const currentData = doc.data() || {};
      const currentTotal = (currentData.averageRating || 0) * (currentData.reviewsCount || 0);
      const newReviewsCount = (currentData.reviewsCount || 0) + 1;
      const newAverage = (currentTotal + rating) / newReviewsCount;

      await statsRef.set({
        reviewsCount: newReviewsCount,
        averageRating: newAverage
      }, { merge: true });
    }

    // Update Heatmap
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const heatmapRef = adminDb.collection("users").doc(uid).collection("stats").doc("heatmap");
    await heatmapRef.set({
      [today]: FieldValue.increment(1)
    }, { merge: true });

  } catch (err) {
    console.error("updateIncrementalStats error", err);
  }
}

/**
 * Fetches the user's activity heatmap.
 */
export async function getHeatmapData(uid: string) {
  try {
    const heatmapRef = adminDb.collection("users").doc(uid).collection("stats").doc("heatmap");
    const doc = await heatmapRef.get();
    return doc.exists ? doc.data() : {};
  } catch (err) {
    console.warn("getHeatmapData error:", err);
    return {};
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



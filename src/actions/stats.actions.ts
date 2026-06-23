"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

/**
 * Computes general statistics for a user profile page.
 * Reads from user_stats table (replaces Firestore users/{uid}/stats/summary).
 */
export async function getUserStats(uid: string) {
  const defaults = {
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
    topDirector: "Unknown",
  };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (error || !data) return defaults;

    return {
      moviesCount: data.movies_watched || 0,
      tvCount: data.tv_watched || 0,
      hoursCount: Number(data.total_hours) || 0,
      avgRating: data.average_rating ? Number(data.average_rating).toFixed(1) : "0.0",
      favoriteGenre: data.favorite_genre || "Drama",
      longestStreak: data.longest_streak || 0,
      currentStreak: data.current_streak || 0,
      favoriteDecade: data.favorite_decade || "2020s",
      favoriteLanguage: data.favorite_language || "en",
      topActor: data.top_actor || "Unknown",
      topDirector: data.top_director || "Unknown",
    };
  } catch (error) {
    console.warn("getUserStats error:", error);
    return defaults;
  }
}

/**
 * Incrementally updates user stats.
 * Called when a new activity (watch, review) is created.
 */
export async function updateIncrementalStats(
  uid: string,
  eventType: "watch" | "review",
  payload: any
) {
  try {
    const supabase = createServiceClient();

    if (eventType === "watch") {
      const { mediaType, hours = 2 } = payload;

      const { data: existing } = await supabase
        .from("user_stats")
        .select("movies_watched, tv_watched, total_hours")
        .eq("user_id", uid)
        .maybeSingle();

      const updates: any = {
        user_id: uid,
        total_hours: Number((existing?.total_hours || 0)) + hours,
        updated_at: new Date().toISOString(),
      };

      if (mediaType === "movie") {
        updates.movies_watched = (existing?.movies_watched || 0) + 1;
      } else if (mediaType === "tv") {
        updates.tv_watched = (existing?.tv_watched || 0) + 1;
      }

      await supabase.from("user_stats").upsert(updates, { onConflict: "user_id" });
    }

    if (eventType === "review") {
      const { rating } = payload;
      const { data: existing } = await supabase
        .from("user_stats")
        .select("average_rating, reviews_count")
        .eq("user_id", uid)
        .maybeSingle();

      const currentTotal = Number(existing?.average_rating || 0) * (existing?.reviews_count || 0);
      const newReviewsCount = (existing?.reviews_count || 0) + 1;
      const newAverage = (currentTotal + rating) / newReviewsCount;

      await supabase.from("user_stats").upsert(
        {
          user_id: uid,
          reviews_count: newReviewsCount,
          average_rating: Math.round(newAverage * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    // Update heatmap
    const today = new Date().toISOString().split("T")[0];
    const { data: heatmap } = await supabase
      .from("user_heatmap")
      .select("count")
      .eq("user_id", uid)
      .eq("date", today)
      .maybeSingle();

    await supabase.from("user_heatmap").upsert(
      { user_id: uid, date: today, count: (heatmap?.count || 0) + 1 },
      { onConflict: "user_id,date" }
    );
  } catch (err) {
    console.error("updateIncrementalStats error", err);
  }
}

/**
 * Fetches the user's activity heatmap.
 */
export async function getHeatmapData(uid: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_heatmap")
      .select("date, count")
      .eq("user_id", uid);

    if (error || !data) return {};

    // Convert to a keyed object { "YYYY-MM-DD": count }
    return data.reduce((acc: Record<string, number>, row) => {
      acc[row.date] = row.count;
      return acc;
    }, {});
  } catch (err) {
    console.warn("getHeatmapData error:", err);
    return {};
  }
}

/**
 * Computes weekly watch summaries for the WeeklyWrapped Card.
 */
export async function getWeeklyWrapped(uid: string) {
  try {
    const supabase = createServiceClient();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: tracking } = await supabase
      .from("watch_tracking")
      .select("media_id, media_type")
      .eq("user_id", uid)
      .eq("status", "watched")
      .gte("watch_date", oneWeekAgo.toISOString());

    const moviesWatched = (tracking || []).filter((d) => d.media_type === "movie").length;
    const tvWatched = (tracking || []).filter((d) => d.media_type === "tv").length;
    const totalWatched = (tracking || []).length;

    if (totalWatched === 0) return null;

    const hoursSpent = moviesWatched * 2 + tvWatched * 10;

    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("user_id", uid)
      .gte("created_at", oneWeekAgo.toISOString());

    const reviewsCount = (reviews || []).length;
    const totalRating = (reviews || []).reduce((acc, r) => acc + (r.rating || 0), 0);
    const avgRating = reviewsCount > 0 ? (totalRating / reviewsCount).toFixed(1) : "0.0";

    let favoriteGenre = "Sci-Fi";
    const firstWatch = tracking?.[0];
    if (firstWatch) {
      try {
        const details =
          firstWatch.media_type === "tv"
            ? await getTVDetails(firstWatch.media_id).catch(() => null)
            : await getMovieDetails(firstWatch.media_id).catch(() => null);
        if (details?.genres?.length) favoriteGenre = details.genres[0].name;
      } catch {}
    }

    return { moviesWatched, tvWatched, hoursSpent, avgRating, favoriteGenre };
  } catch (error) {
    console.warn("getWeeklyWrapped error:", error);
    return null;
  }
}

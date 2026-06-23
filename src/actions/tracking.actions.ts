"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { updateIncrementalStats } from "./stats.actions";

type WatchStatus = "watched" | "watching" | "want_to_watch" | "dropped";

export async function setWatchStatus(
  mediaId: string,
  mediaType: "movie" | "tv",
  status: WatchStatus | null
) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  const trackingId = `${user.id}_${mediaId}`;

  try {
    const supabase = await createClient();

    if (status === null) {
      await supabase.from("watch_tracking").delete().eq("id", trackingId);
    } else {
      await supabase.from("watch_tracking").upsert(
        {
          id: trackingId,
          user_id: user.id,
          media_id: mediaId,
          media_type: mediaType,
          status,
          watch_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (status === "watched" || status === "want_to_watch") {
        let mediaDetails: any = null;
        if (mediaType === "tv") {
          mediaDetails = await getTVDetails(mediaId).catch(() => null);
        } else {
          mediaDetails = await getMovieDetails(mediaId).catch(() => null);
        }

        const title = mediaDetails ? (mediaDetails.title || mediaDetails.name) : "Film Details";
        const mediaSnapshot = mediaDetails
          ? {
              id: mediaId,
              title,
              posterPath: mediaDetails.poster_path || null,
              backdropPath: mediaDetails.backdrop_path || null,
              rating: mediaDetails.vote_average || 0,
              releaseYear:
                mediaDetails.release_date?.split("-")[0] ||
                mediaDetails.first_air_date?.split("-")[0] ||
                "",
              mediaType,
            }
          : null;

        const activityType = status === "want_to_watch" ? "watchlist_added" : "watched";

        const { createPostAction } = await import("./social.actions");
        await createPostAction({
          type: activityType,
          mediaSnapshot,
          movieId: mediaType === "movie" ? mediaId : null,
          tvId: mediaType === "tv" ? mediaId : null,
        }).catch(() => {});

        if (status === "watched") {
          const hours = mediaType === "movie" ? 2 : 10;
          await updateIncrementalStats(user.id, "watch", { mediaType, hours }).catch(() => {});
        }

        const { updateUserStreak } = await import("./user.actions");
        await updateUserStreak(user.id).catch(() => {});
      }
    }

    revalidatePath(`/${mediaType}/${mediaId}`);
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("setWatchStatus error:", error);
    return { success: false, error: "Failed to update watch status" };
  }
}

export async function getWatchStatus(mediaId: string): Promise<WatchStatus | null> {
  const user = await verifySession();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const trackingId = `${user.id}_${mediaId}`;
    const { data } = await supabase
      .from("watch_tracking")
      .select("status")
      .eq("id", trackingId)
      .maybeSingle();
    return (data?.status as WatchStatus) ?? null;
  } catch {
    return null;
  }
}

export async function toggleFavoriteMedia(mediaId: string, mediaType: "movie" | "tv") {
  // Favorites are now handled via the favorite_movies table and pinFavorite action in user.actions.ts
  // This stub maintains API compatibility
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  return { success: true, isFavorite: false };
}

export async function getIsFavoriteMedia(mediaId: string): Promise<boolean> {
  const user = await verifySession();
  if (!user) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("favorite_movies")
      .select("id")
      .eq("user_id", user.id)
      .eq("tmdb_id", parseInt(mediaId, 10))
      .maybeSingle();
    return data !== null;
  } catch {
    return false;
  }
}

export async function getContinueWatching() {
  const user = await verifySession();
  if (!user) return [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("watch_tracking")
      .select("media_id, media_type, watch_date, status")
      .eq("user_id", user.id)
      .eq("status", "watching")
      .order("watch_date", { ascending: false })
      .limit(10);

    const fetchPromises = (data || []).map(async (row) => {
      let details: any = null;
      if (row.media_type === "tv") {
        details = await getTVDetails(row.media_id).catch(() => null);
      } else {
        details = await getMovieDetails(row.media_id).catch(() => null);
      }
      if (!details) return null;

      return {
        id: details.id,
        title: details.title || details.name,
        poster_path: details.poster_path,
        vote_average: details.vote_average,
        release_date: details.release_date || details.first_air_date,
        genre_ids: details.genres?.map((g: any) => g.id) || [],
        media_type: row.media_type,
        progress: 0,
        totalDuration: details.runtime || details.episode_run_time?.[0] || 120,
        lastWatchedAt: row.watch_date || new Date().toISOString(),
        status: row.status,
      };
    });

    const results = await Promise.all(fetchPromises);
    return results.filter(Boolean);
  } catch (error) {
    console.warn("getContinueWatching error:", error);
    return [];
  }
}

export async function getWatchlist(limitCount = 30) {
  const user = await verifySession();
  if (!user) return [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("watch_tracking")
      .select("media_id, media_type, added_at")
      .eq("user_id", user.id)
      .eq("status", "want_to_watch")
      .order("added_at", { ascending: false })
      .limit(limitCount);

    return data || [];
  } catch (error) {
    console.warn("getWatchlist error:", error);
    return [];
  }
}

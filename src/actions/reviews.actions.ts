"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";
import { updateIncrementalStats } from "./stats.actions";

export async function createReview(
  mediaId: string,
  mediaType: "movie" | "tv",
  rating: number,
  content: string,
  hasSpoilers: boolean
) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (rating === 0) return { success: false, error: "Rating is required" };
  if (content.length > 2000) return { success: false, error: "Review cannot exceed 2000 characters" };

  try {
    const supabase = createServiceClient();

    // Fetch TMDB details for media snapshot
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

    // Upsert into reviews table (one review per user per media)
    const { error: reviewError } = await supabase.from("reviews").upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        rating,
        content,
        has_spoilers: hasSpoilers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_id" }
    );

    if (reviewError) throw reviewError;

    // Write unified activity entry for the feed
    const { createPostAction } = await import("./social.actions");
    await createPostAction({
      type: "reviewed",
      reviewText: content,
      rating,
      containsSpoilers: hasSpoilers,
      mediaSnapshot,
      movieId: mediaType === "movie" ? mediaId : null,
      tvId: mediaType === "tv" ? mediaId : null,
    });

    const { updateUserStreak } = await import("./user.actions");
    await updateUserStreak(user.id).catch(() => {});
    await updateIncrementalStats(user.id, "review", { rating }).catch(() => {});

    revalidatePath(`/${mediaType}/${mediaId}`);
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("createReview error:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

export async function getReviews(mediaId: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(`*, profiles!reviews_user_id_fkey (display_name, username, avatar_url)`)
      .eq("media_id", mediaId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((r) => ({
      ...r,
      user: {
        displayName: (r.profiles as any)?.display_name ?? "Deleted User",
        username: (r.profiles as any)?.username ?? "",
        photoURL: (r.profiles as any)?.avatar_url ?? "",
      },
    }));
  } catch (error) {
    console.warn("getReviews error:", error);
    return [];
  }
}

export async function likeReview(reviewId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const { data: review } = await supabase
      .from("reviews")
      .select("likes_count")
      .eq("id", reviewId)
      .single();

    const { error } = await supabase
      .from("reviews")
      .update({ likes_count: (review?.likes_count || 0) + 1 })
      .eq("id", reviewId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to like review" };
  }
}

export async function getUserRating(mediaId: string): Promise<number | null> {
  const user = await verifySession();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("media_id", mediaId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.rating ?? null;
  } catch (error) {
    console.warn("getUserRating error:", error);
    return null;
  }
}

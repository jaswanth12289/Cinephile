"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

type WatchStatus = "watched" | "watching" | "want_to_watch" | "dropped";

export async function setWatchStatus(
  mediaId: string,
  mediaType: "movie" | "tv",
  status: WatchStatus | null // null = remove entry
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const docId = `${session.uid}_${mediaId}`;
  const ref = adminDb.collection("watchTracking").doc(docId);

  try {
    const watchlistRef = adminDb.collection("watchlist").doc(docId);

    if (status === null) {
      await ref.delete();
      await watchlistRef.delete();
    } else {
      await ref.set(
        {
          id: docId,
          userId: session.uid,
          mediaId,
          mediaType,
          status,
          watchDate: new Date(),
        },
        { merge: true }
      );

      if (status === "want_to_watch") {
        await watchlistRef.set({
          userId: session.uid,
          mediaId,
          mediaType,
          addedAt: new Date()
        });
      } else {
        await watchlistRef.delete();
      }

      // Log to unified activities collection (only for watched/want_to_watch)
      if (status === "watched" || status === "want_to_watch") {
        let mediaDetails: any = null;
        if (mediaType === "tv") {
          mediaDetails = await getTVDetails(mediaId).catch(() => null);
        } else {
          mediaDetails = await getMovieDetails(mediaId).catch(() => null);
        }

        const title = mediaDetails ? (mediaDetails.title || mediaDetails.name) : "Film Details";
        const mediaSnapshot = mediaDetails ? {
          id: mediaId,
          title,
          posterPath: mediaDetails.poster_path || null,
          backdropPath: mediaDetails.backdrop_path || null,
          rating: mediaDetails.vote_average || 0,
          releaseYear: mediaDetails.release_date?.split("-")[0] || mediaDetails.first_air_date?.split("-")[0] || "",
          mediaType,
        } : null;

        const activityType = status === "want_to_watch"
          ? "watchlist_added"
          : (mediaType === "tv" ? "finished_series" : "watched");

        const activityRef = adminDb.collection("activities").doc();
        await activityRef.set({
          id: activityRef.id,
          userId: session.uid,
          type: activityType,
          movieId: mediaType === "movie" ? mediaId : null,
          tvId: mediaType === "tv" ? mediaId : null,
          rating: null,
          reviewText: null,
          containsSpoilers: false,
          createdAt: new Date(),
          mediaSnapshot,
        });
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

export async function getWatchStatus(
  mediaId: string
): Promise<WatchStatus | null> {
  const session = await verifySession();
  if (!session) return null;

  const docId = `${session.uid}_${mediaId}`;
  const doc = await adminDb.collection("watchTracking").doc(docId).get();

  if (!doc.exists) return null;
  return (doc.data()?.status as WatchStatus) ?? null;
}

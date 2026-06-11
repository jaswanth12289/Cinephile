"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

export async function createReview(
  mediaId: string,
  mediaType: "movie" | "tv",
  rating: number,
  content: string,
  hasSpoilers: boolean
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (rating === 0) return { success: false, error: "Rating is required" };
  if (content.length > 2000) return { success: false, error: "Review cannot exceed 2000 characters" };

  try {
    // 1. Fetch TMDB details once to create a local mediaSnapshot
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

    const ref = adminDb.collection("reviews").doc();
    await ref.set({
      id: ref.id,
      userId: session.uid,
      mediaId,
      mediaType,
      rating,
      content,
      hasSpoilers,
      likesCount: 0,
      createdAt: new Date(),
    });

    // 2. Write unified activity log for "reviewed" (micro-review or full review)
    const activityRef = adminDb.collection("activities").doc();
    await activityRef.set({
      id: activityRef.id,
      userId: session.uid,
      type: "reviewed",
      movieId: mediaType === "movie" ? mediaId : null,
      tvId: mediaType === "tv" ? mediaId : null,
      rating,
      reviewText: content,
      containsSpoilers: hasSpoilers,
      createdAt: new Date(),
      mediaSnapshot,
    });

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
    const snapshot = await adminDb
      .collection("reviews")
      .where("mediaId", "==", mediaId)
      .get();

    // Sort in memory by createdAt descending
    const docsData = snapshot.docs.map((doc) => doc.data());
    docsData.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return timeB - timeA;
    });

    const limitedDocs = docsData.slice(0, 20);

    // Fetch user data for each review
    const reviews = await Promise.all(
      limitedDocs.map(async (data) => {
        const userDoc = await adminDb.collection("users").doc(data.userId).get();
        const user = userDoc.data();
        return {
          ...data,
          user: {
            displayName: user?.displayName ?? "Deleted User",
            username: user?.username ?? "",
            photoURL: user?.photoURL ?? "",
          },
        };
      })
    );

    return reviews;
  } catch (error) {
    console.warn("getReviews error:", error);
    return [];
  }
}

export async function likeReview(reviewId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const ref = adminDb.collection("reviews").doc(reviewId);
    await ref.update({ likesCount: FieldValue.increment(1) });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to like review" };
  }
}

"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";

export async function submitRecommendationFeedback(
  movieId: number,
  feedback: "helpful" | "not_interested"
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const docId = `movie_${movieId}`;
    const feedbackRef = adminDb
      .collection("users")
      .doc(session.uid)
      .collection("recommendationFeedback")
      .doc(docId);

    await feedbackRef.set({
      movieId,
      feedback,
      createdAt: new Date()
    });

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("submitRecommendationFeedback error:", error);
    return { success: false, error: "Failed to submit recommendation feedback" };
  }
}

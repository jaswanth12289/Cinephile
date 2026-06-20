"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

async function fetchTMDBRecommendations(mediaId: string, mediaType: "movie" | "tv") {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${mediaId}/recommendations`, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        Accept: "application/json"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

/**
 * Generates personalized heuristic recommendations based on the user's highly rated movies.
 * Caches them in the `recommendations` subcollection.
 * Only regenerates if the collection is empty to prevent constant API thrashing.
 */
export async function generateRecommendationsAction() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const uid = session.uid;
  const { FieldValue } = await import("firebase-admin/firestore");
  
  // 1. Check if we already have recent recommendations cached
  const existingRecsSnap = await adminDb.collection("users").doc(uid).collection("recommendations").limit(1).get();
  if (!existingRecsSnap.empty) {
    return { success: true, cached: true };
  }

  try {
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    const previouslyRecommended = new Set(userData?.previouslyRecommended || []);
    const dislikedRecommendations = new Set(userData?.dislikedRecommendations || []);

    // 2. Fetch all user watchTracking to exclude them
    const trackingSnap = await adminDb.collection("watchTracking")
      .where("userId", "==", uid)
      .get();
    
    const trackingIds = new Set(trackingSnap.docs.map(doc => doc.data().mediaId.toString()));
    const historyItems = trackingSnap.docs.map(doc => doc.data()).filter(d => d.rating && d.rating >= 4);

    if (historyItems.length === 0) {
      return { success: true, message: "Not enough highly rated history to generate recommendations." };
    }
    
    // Pick 2 random highly-rated items
    const shuffled = historyItems.sort(() => 0.5 - Math.random());
    const seeds = shuffled.slice(0, 2);

    const batch = adminDb.batch();
    const recsRef = adminDb.collection("users").doc(uid).collection("recommendations");

    let count = 0;
    const newRecIds: string[] = [];

    for (const seed of seeds) {
      const tmdbRes = await fetch(`${TMDB_BASE_URL}/${seed.mediaType}/${seed.mediaId}`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
      }).then(r => r.json()).catch(() => null);

      if (!tmdbRes) continue;
      
      const seedTitle = tmdbRes.title || tmdbRes.name;
      const recs = await fetchTMDBRecommendations(seed.mediaId, seed.mediaType);
      
      for (const rec of recs) {
        const strId = rec.id.toString();
        
        // --- MEMORY FILTERING ---
        if (!rec.poster_path) continue;
        if (trackingIds.has(strId)) continue;
        if (previouslyRecommended.has(strId)) continue;
        if (dislikedRecommendations.has(strId)) continue;
        if (newRecIds.includes(strId)) continue;

        const docRef = recsRef.doc(strId);
        batch.set(docRef, {
          mediaId: strId,
          mediaType: seed.mediaType,
          reason: `Because you liked ${seedTitle}`,
          score: rec.vote_average || 0,
          posterPath: rec.poster_path,
          title: rec.title || rec.name,
          createdAt: new Date()
        });
        
        newRecIds.push(strId);
        count++;

        // Maximum 5 new recs per seed
        if (newRecIds.length % 5 === 0) break;
      }
    }

    if (count > 0) {
      // Record these as previously recommended
      batch.update(userDocRef, {
        previouslyRecommended: FieldValue.arrayUnion(...newRecIds)
      });
      await batch.commit();
    }

    return { success: true, count };
  } catch (error) {
    console.error("generateRecommendations error:", error);
    return { success: false, error: "Failed to generate recommendations" };
  }
}

export async function hideRecommendationAction(mediaId: string) {
  const session = await verifySession();
  if (!session) return { success: false };

  try {
    const uid = session.uid;
    // 1. Delete from recommendations subcollection
    await adminDb.collection("users").doc(uid).collection("recommendations").doc(mediaId).delete();
    
    // 2. Add to dislikedRecommendations array on UserDoc
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.collection("users").doc(uid).update({
      dislikedRecommendations: FieldValue.arrayUnion(mediaId)
    });

    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

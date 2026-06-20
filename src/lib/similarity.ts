import { adminDb } from "@/lib/firebase/admin";

export interface TasteMatchResult {
  similarityScore: number; // 0 to 100
  sharedGenresCount: number;
  sharedHighlyRatedCount: number;
  sharedFavoritesCount: number;
  sharedHighlyRatedMediaIds: string[];
  sharedFavoriteMediaIds: string[];
}

/**
 * Calculates a Taste Match similarity score between two users.
 * 
 * Weights:
 * 40% Shared Genres (userDoc.preferences.favoriteGenres)
 * 35% Shared Highly Rated Movies (watchTracking rating >= 4)
 * 15% Shared Favorites (userDoc.favorites)
 * 10% Shared Directors (Placeholder / Hardcoded to 0 for now unless we cache directors)
 */
export async function calculateUserSimilarity(uidA: string, uidB: string): Promise<TasteMatchResult> {
  if (uidA === uidB) {
    return {
      similarityScore: 100,
      sharedGenresCount: 3,
      sharedHighlyRatedCount: 0,
      sharedFavoritesCount: 4,
      sharedHighlyRatedMediaIds: [],
      sharedFavoriteMediaIds: []
    };
  }

  const [userDocA, userDocB] = await Promise.all([
    adminDb.collection("users").doc(uidA).get(),
    adminDb.collection("users").doc(uidB).get()
  ]);

  if (!userDocA.exists || !userDocB.exists) {
    return { similarityScore: 0, sharedGenresCount: 0, sharedHighlyRatedCount: 0, sharedFavoritesCount: 0, sharedHighlyRatedMediaIds: [], sharedFavoriteMediaIds: [] };
  }

  const dataA = userDocA.data();
  const dataB = userDocB.data();

  // 1. Shared Genres (40%)
  const genresA = dataA?.preferences?.favoriteGenres || [];
  const genresB = dataB?.preferences?.favoriteGenres || [];
  
  let sharedGenresCount = 0;
  genresA.forEach((g: string) => {
    if (genresB.includes(g)) sharedGenresCount++;
  });
  
  // Max possible shared genres is 3.
  const genreScore = Math.min((sharedGenresCount / 3) * 40, 40);

  // 2. Shared Favorites (15%)
  const favsA = (dataA?.favorites || []).filter((f: any) => f !== null).map((f: any) => f.tmdbId.toString());
  const favsB = (dataB?.favorites || []).filter((f: any) => f !== null).map((f: any) => f.tmdbId.toString());
  
  let sharedFavoritesCount = 0;
  const sharedFavoriteMediaIds: string[] = [];
  favsA.forEach((id: string) => {
    if (favsB.includes(id)) {
      sharedFavoritesCount++;
      sharedFavoriteMediaIds.push(id);
    }
  });

  // Max favorites is 4
  const favoritesScore = Math.min((sharedFavoritesCount / 4) * 15, 15);

  // 3. Shared Highly Rated Movies (35%)
  // Query both users' watchTracking where rating >= 4
  const [watchA, watchB] = await Promise.all([
    adminDb.collection("watchTracking").where("userId", "==", uidA).where("rating", ">=", 4).get(),
    adminDb.collection("watchTracking").where("userId", "==", uidB).where("rating", ">=", 4).get()
  ]);

  const ratedA = new Set(watchA.docs.map(doc => doc.data().mediaId));
  const ratedB = new Set(watchB.docs.map(doc => doc.data().mediaId));

  let sharedHighlyRatedCount = 0;
  const sharedHighlyRatedMediaIds: string[] = [];
  ratedA.forEach(id => {
    if (ratedB.has(id)) {
      sharedHighlyRatedCount++;
      sharedHighlyRatedMediaIds.push(id);
    }
  });

  // Base the score on how much they overlap vs how many they have rated. 
  // Let's use Jaccard index or a simple threshold.
  // If they share at least 10 highly rated movies, they get max points.
  const ratedScore = Math.min((sharedHighlyRatedCount / 10) * 35, 35);

  // 4. Shared Directors (10%)
  // We'll leave this as a flat 5% baseline if they have any overlap, or 0% otherwise, to avoid TMDB lookups per movie.
  // In a real production environment, directors would be cached in watchTracking.
  const directorScore = sharedHighlyRatedCount > 0 ? 10 : 0;

  const totalScore = Math.round(genreScore + favoritesScore + ratedScore + directorScore);

  return {
    similarityScore: Math.min(totalScore, 100),
    sharedGenresCount,
    sharedHighlyRatedCount,
    sharedFavoritesCount,
    sharedHighlyRatedMediaIds,
    sharedFavoriteMediaIds
  };
}

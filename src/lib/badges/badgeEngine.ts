import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const BADGE_DEFINITIONS = {
  // Activity
  FIRST_THOUGHT: { id: "first_thought", name: "First Thought", icon: "💭", category: "activity" },
  SOCIAL_STARTER: { id: "social_starter", name: "Social Starter", icon: "💬", category: "activity" },
  COMMUNITY_VOICE: { id: "community_voice", name: "Community Voice", icon: "🗣️", category: "activity" },
  THIRTY_DAY_STREAK: { id: "thirty_day_streak", name: "30 Day Streak", icon: "🔥", category: "activity" },
  
  // Reviews
  CRITIC: { id: "critic", name: "Critic", icon: "✍️", category: "reviews" },
  REVIEWER: { id: "reviewer", name: "Reviewer", icon: "📝", category: "reviews" },
  REVIEWER_50: { id: "reviewer_50", name: "Prolific Reviewer", icon: "✍️", category: "reviews" },
  TOP_REVIEWER: { id: "top_reviewer", name: "Top Reviewer", icon: "🏆", category: "reviews" },
  
  // Lists
  LIST_MASTER: { id: "list_master", name: "List Master", icon: "📚", category: "lists" },

  // Watching
  MOVIE_EXPLORER: { id: "movie_explorer", name: "Movie Explorer", icon: "🎬", category: "watching" },
  MARATHONER: { id: "marathoner", name: "Marathoner", icon: "🏃", category: "watching" },
  MOVIE_MARATHON: { id: "movie_marathon", name: "Movie Marathon", icon: "🍿", category: "watching" },
  EXPLORER: { id: "explorer", name: "Explorer", icon: "🌎", category: "watching" },
  SCI_FI_FAN: { id: "sci_fi_fan", name: "Sci-Fi Fan", icon: "🛸", category: "watching" },
  
  // Community
  RISING_STAR: { id: "rising_star", name: "Rising Star", icon: "⭐", category: "community" },
  POPULAR_MEMBER: { id: "popular_member", name: "Popular Member", icon: "🌟", category: "community" },
  
  // Special
  BETA_MEMBER: { id: "beta_member", name: "Beta Member", icon: "🚀", category: "special" },
};

/**
 * Lazily evaluates and awards badges for a given user.
 */
export async function evaluateBadges(userId: string) {
  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    const userData = userDoc.data();
    if (!userData) return;

    // Get current badges
    const currentBadges = new Set<string>(userData.badges || []);
    const newBadges = new Set<string>(currentBadges);

    // 1. Fetch Stats for evaluation
    const statsDoc = await adminDb.collection("users").doc(userId).collection("stats").doc("summary").get();
    const stats = statsDoc.exists ? statsDoc.data()! : {};

    const thoughtsSnap = await adminDb.collection("activities").where("userId", "==", userId).where("type", "==", "post").count().get();
    const reviewsSnap = await adminDb.collection("activities").where("userId", "==", userId).where("type", "==", "reviewed").count().get();
    const listsSnap = await adminDb.collection("lists").where("userId", "==", userId).count().get();

    const thoughtsCount = thoughtsSnap.data().count;
    const reviewsCount = reviewsSnap.data().count;
    const listsCount = listsSnap.data().count;
    const followersCount = userData.followersCount || 0;

    // 2. Evaluate Activity Badges
    if (thoughtsCount >= 1) newBadges.add(BADGE_DEFINITIONS.FIRST_THOUGHT.id);
    if (thoughtsCount >= 10) newBadges.add(BADGE_DEFINITIONS.SOCIAL_STARTER.id);
    if (thoughtsCount >= 100) newBadges.add(BADGE_DEFINITIONS.COMMUNITY_VOICE.id);
    if ((stats.longestStreak || 0) >= 30) newBadges.add(BADGE_DEFINITIONS.THIRTY_DAY_STREAK.id);

    // 3. Evaluate Review Badges
    if (reviewsCount >= 1) newBadges.add(BADGE_DEFINITIONS.CRITIC.id);
    if (reviewsCount >= 10) newBadges.add(BADGE_DEFINITIONS.REVIEWER.id);
    if (reviewsCount >= 50) newBadges.add(BADGE_DEFINITIONS.REVIEWER_50.id);
    if (reviewsCount >= 100) newBadges.add(BADGE_DEFINITIONS.TOP_REVIEWER.id);

    // 4. Evaluate List Badges
    if (listsCount >= 5) newBadges.add(BADGE_DEFINITIONS.LIST_MASTER.id);

    // 5. Evaluate Watching Badges
    const watchesCount = stats.moviesWatched || 0;
    if (watchesCount >= 1) newBadges.add(BADGE_DEFINITIONS.MOVIE_EXPLORER.id);
    if (watchesCount >= 100) newBadges.add(BADGE_DEFINITIONS.MARATHONER.id);
    
    // Check Movie Marathon (7 days)
    // We check the heatmap cache for any week with 10+ watches
    const heatmapDoc = await adminDb.collection("users").doc(userId).collection("stats").doc("heatmap").get();
    if (heatmapDoc.exists) {
      const data = heatmapDoc.data()!;
      // A simple heuristic for "10 movies in a week" using the heatmap
      let totalRecent = 0;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        totalRecent += (data[dateStr] || 0);
      }
      if (totalRecent >= 10) newBadges.add(BADGE_DEFINITIONS.MOVIE_MARATHON.id);
    }

    if (stats.favoriteGenre === "Sci-Fi" && watchesCount >= 20) {
      newBadges.add(BADGE_DEFINITIONS.SCI_FI_FAN.id);
    }
    
    // Explorer badge: This is tricky to calculate exactly without parsing all genres, 
    // but if they watched > 50 movies, we can probabilistically award it or use the stats tab favoriteLanguage entropy.
    if (watchesCount >= 50) newBadges.add(BADGE_DEFINITIONS.EXPLORER.id);

    // 6. Evaluate Community Badges
    if (followersCount >= 10) newBadges.add(BADGE_DEFINITIONS.RISING_STAR.id);
    if (followersCount >= 100) newBadges.add(BADGE_DEFINITIONS.POPULAR_MEMBER.id);

    // 7. Special Beta Badge
    newBadges.add(BADGE_DEFINITIONS.BETA_MEMBER.id);

    // 8. Update if changed
    if (newBadges.size > currentBadges.size) {
      await userRef.update({
        badges: Array.from(newBadges)
      });
    }

  } catch (error) {
    console.warn("evaluateBadges error:", error);
  }
}

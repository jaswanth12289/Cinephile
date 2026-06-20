"use server";

import { adminDb } from "@/lib/firebase/admin";

export async function getTrendingHashtags(): Promise<{ tag: string; count: number }[]> {
  // In a real production app, this would be computed offline via Cloud Functions
  // or BigQuery. For RC9, we'll fetch recent activities and aggregate.
  try {
    const snap = await adminDb
      .collection("activities")
      .where("type", "==", "post")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const tagCounts: Record<string, number> = {};

    snap.docs.forEach((doc) => {
      const data = doc.data();
      const hashtags: string[] = data.hashtags || [];
      hashtags.forEach((tag) => {
        const lowerTag = tag.toLowerCase();
        tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1;
      });
    });

    const trending = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return trending;
  } catch (error) {
    console.error("Failed to fetch trending hashtags:", error);
    return [];
  }
}

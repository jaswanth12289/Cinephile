"use server";

import { adminDb } from "@/lib/firebase/admin";

export async function createMentionNotification(
  recipientId: string,
  actorId: string,
  actorUsername: string,
  activityId: string
) {
  if (recipientId === actorId) return;

  try {
    // Deterministic ID: mention_activityId_actorId
    const notifId = `mention_${activityId}_${actorId}`;
    const notificationRef = adminDb
      .collection("users")
      .doc(recipientId)
      .collection("notifications")
      .doc(notifId);

    await notificationRef.set({
      id: notificationRef.id,
      type: "mention",
      actorId,
      actorUsername,
      activityId,
      message: `${actorUsername} mentioned you in a thought.`,
      isRead: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create mention notification:", error);
  }
}

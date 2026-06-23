"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";

/**
 * Creates a notification for a user.
 * Called from social.actions.ts after follows, likes, comments, mentions.
 * Uses service role to bypass RLS (notifications inserted by server only).
 */
export async function createNotification(data: {
  userId: string;       // recipient
  actorId: string;      // sender
  type: "like" | "comment" | "follow" | "mention" | "reaction";
  activityId?: string;
  reactionType?: string;
  commentText?: string;
}) {
  try {
    const supabase = createServiceClient();
    await supabase.from("notifications").insert({
      user_id: data.userId,
      actor_id: data.actorId,
      type: data.type,
      activity_id: data.activityId || null,
      reaction_type: data.reactionType || null,
      comment_text: data.commentText ? data.commentText.slice(0, 120) : null,
      read: false,
    });
  } catch (error) {
    console.warn("createNotification error:", error);
  }
}

/**
 * Fetches notifications for the logged-in user.
 */
export async function getNotifications(limitCount = 30) {
  const user = await verifySession();
  if (!user) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        activity:activities (
          id,
          type,
          post_text,
          media_snapshot
        )
        `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getNotifications error:", error);
    return [];
  }
}

/**
 * Marks all unread notifications as read.
 */
export async function markNotificationsAsRead() {
  const user = await verifySession();
  if (!user) return;

  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("read", false);
  } catch (error) {
    console.warn("markNotificationsAsRead error:", error);
  }
}

/**
 * Gets the count of unread notifications.
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  const user = await verifySession();
  if (!user) return 0;

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn("getUnreadNotificationsCount error:", error);
    return 0;
  }
}

/**
 * Creates a mention notification if the mentioned user exists.
 */
export async function createMentionNotification(
  mentionedUsername: string,
  actorId: string,
  activityId: string
) {
  try {
    const supabase = createServiceClient();
    const { data: mentioned } = await supabase
      .from("profiles")
      .select("id")
      .eq("username_lower", mentionedUsername.toLowerCase())
      .maybeSingle();

    if (!mentioned || mentioned.id === actorId) return;

    await createNotification({
      userId: mentioned.id,
      actorId,
      type: "mention",
      activityId,
    });
  } catch (error) {
    console.warn("createMentionNotification error:", error);
  }
}


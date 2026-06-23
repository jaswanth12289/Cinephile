"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { createNotification, createMentionNotification } from "./notifications.actions";
import { updateIncrementalStats } from "./stats.actions";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

async function upsertHashtagsForActivity(supabase: any, activityId: string, hashtags: string[]) {
  if (!hashtags.length) return;
  for (const tag of hashtags) {
    const { data: existing } = await supabase
      .from("hashtags")
      .upsert({ tag }, { onConflict: "tag" })
      .select("id")
      .single();
    const hashtagId = existing?.id;
    if (hashtagId) {
      await supabase
        .from("activity_hashtags")
        .upsert({ activity_id: activityId, hashtag_id: hashtagId }, { onConflict: "activity_id,hashtag_id" });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SOCIAL: Follows
// ─────────────────────────────────────────────────────────────

export async function followUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (user.id === targetUserId) return { success: false, error: "Cannot follow yourself" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("follows").upsert(
      { follower_id: user.id, following_id: targetUserId },
      { onConflict: "follower_id,following_id" }
    );
    if (error) throw error;

    await createNotification({ userId: targetUserId, actorId: user.id, type: "follow" });
    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    console.warn("followUser error:", error);
    return { success: false, error: error.message || "Failed to follow user" };
  }
}

export async function unfollowUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    console.warn("unfollowUser error:", error);
    return { success: false, error: "Failed to unfollow user" };
  }
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const user = await verifySession();
  if (!user) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();
    return data !== null;
  } catch {
    return false;
  }
}

export async function getFollowStatus(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { isFollowing: false, isFollowedBy: false };
  try {
    const supabase = await createClient();
    const [{ data: fwd }, { data: bwd }] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle(),
      supabase.from("follows").select("follower_id").eq("follower_id", targetUserId).eq("following_id", user.id).maybeSingle(),
    ]);
    return { isFollowing: fwd !== null, isFollowedBy: bwd !== null };
  } catch {
    return { isFollowing: false, isFollowedBy: false };
  }
}

export async function getSuggestedUsers(limitCount = 10) {
  const user = await verifySession();
  if (!user) return [];

  try {
    const supabase = await createClient();

    // Get IDs the user already follows
    const { data: alreadyFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = [user.id, ...(alreadyFollows || []).map((f) => f.following_id)];

    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, followers_count")
      .not("id", "in", `(${followingIds.join(",")})`)
      .eq("profile_completed", true)
      .order("followers_count", { ascending: false })
      .limit(limitCount);

    return (data || []).map((u) => ({
      uid: u.id,
      displayName: u.display_name || "Cinephile User",
      username: u.username,
      photoURL: u.avatar_url,
      bio: u.bio,
      followersCount: u.followers_count,
    }));
  } catch (error) {
    console.warn("getSuggestedUsers error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// POSTS: Create / Edit / Delete
// ─────────────────────────────────────────────────────────────

export async function createPostAction(data: {
  postText?: string;
  imageUrls?: string[];
  poll?: { options: string[]; endsAt?: string } | null;
  quoteActivityId?: string | null;
  quoteSnapshot?: any | null;
  mediaSnapshot?: any | null;
  movieId?: string | null;
  tvId?: string | null;
  rating?: number | null;
  reviewText?: string | null;
  containsSpoilers?: boolean;
  type?: "post" | "reviewed" | "watched" | "rewatched" | "watchlist_added";
}) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  const type = data.type || "post";
  const postText = data.postText?.trim() || "";

  if (type === "post" && !postText && (!data.imageUrls || data.imageUrls.length === 0) && !data.poll) {
    return { success: false, error: "Post cannot be empty" };
  }
  if (postText.length > 2000) return { success: false, error: "Post cannot exceed 2000 characters" };

  const hashtags = extractHashtags(postText);
  const mentionedUsernames = extractMentions(postText);

  try {
    const supabase = createServiceClient();

    const mentionsPayload = mentionedUsernames.map((u) => ({ username: u }));

    const { data: activity, error } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        type,
        post_text: postText || null,
        image_urls: data.imageUrls || [],
        poll: data.poll ? { ...data.poll, totalVotes: 0 } : null,
        quote_activity_id: data.quoteActivityId || null,
        quote_snapshot: data.quoteSnapshot || null,
        media_snapshot: data.mediaSnapshot || null,
        movie_id: data.movieId || null,
        tv_id: data.tvId || null,
        rating: data.rating || null,
        review_text: data.reviewText || null,
        contains_spoilers: data.containsSpoilers || false,
        hashtags,
        mentions: mentionsPayload,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Persist hashtags
    await upsertHashtagsForActivity(supabase, activity.id, hashtags);

    // Persist mentions + send notifications
    for (const username of mentionedUsernames) {
      await createMentionNotification(username, user.id, activity.id).catch(() => {});
    }

    // Update stats
    if (type === "watched" || type === "rewatched") {
      const mediaType = data.movieId ? "movie" : "tv";
      await updateIncrementalStats(user.id, "watch", { mediaType }).catch(() => {});
    }
    if (type === "reviewed") {
      await updateIncrementalStats(user.id, "review", { rating: data.rating || 0 }).catch(() => {});
    }

    // Update user streak
    const { updateUserStreak } = await import("./user.actions");
    await updateUserStreak(user.id).catch(() => {});

    revalidatePath("/feed");
    return { success: true, activityId: activity.id };
  } catch (error: any) {
    console.error("createPostAction error:", error);
    return { success: false, error: error.message || "Failed to create post" };
  }
}

export async function editPostAction(activityId: string, postText: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (postText.length > 2000) return { success: false, error: "Post cannot exceed 2000 characters" };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("activities")
      .update({
        post_text: postText.trim(),
        hashtags: extractHashtags(postText),
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (error) throw error;
    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to edit post" };
  }
}

export async function deleteActivityAction(activityId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    // Soft delete
    const { error } = await supabase
      .from("activities")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (error) throw error;
    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete post" };
  }
}

// ─────────────────────────────────────────────────────────────
// FEED
// ─────────────────────────────────────────────────────────────

export async function fetchFeedActivitiesAction({
  cursor,
  limit = 20,
}: { cursor?: string; limit?: number } = {}) {
  const user = await verifySession();
  if (!user) return { activities: [], nextCursor: null };

  try {
    const supabase = await createClient();

    // Get all user IDs this user follows (for feed)
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = (follows || []).map((f) => f.following_id);
    // Include own posts in feed
    const feedUserIds = [...followingIds, user.id];

    // Get muted users
    const { data: muted } = await supabase
      .from("muted_users")
      .select("muted_user_id")
      .eq("user_id", user.id);
    const mutedIds = (muted || []).map((m) => m.muted_user_id);

    // Get blocked users
    const { data: blocked } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", user.id);
    const blockedIds = (blocked || []).map((b) => b.blocked_user_id);

    const excludedIds = [...mutedIds, ...blockedIds];

    let query = supabase
      .from("activities")
      .select(
        `
        *,
        profiles!activities_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
        `
      )
      .in("user_id", feedUserIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    // Exclude muted/blocked
    if (excludedIds.length > 0) {
      query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
    }

    // Cursor pagination
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const activities = (data || []).slice(0, limit);
    const nextCursor =
      (data || []).length > limit ? activities[activities.length - 1]?.created_at : null;

    return { activities, nextCursor };
  } catch (error) {
    console.warn("fetchFeedActivitiesAction error:", error);
    return { activities: [], nextCursor: null };
  }
}

export async function getActivityById(activityId: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("activities")
      .select(
        `
        *,
        profiles!activities_user_id_fkey (
          id, username, display_name, avatar_url
        )
        `
      )
      .eq("id", activityId)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("getActivityById error:", error);
    return null;
  }
}

export async function getUserActivities(userId: string, types?: string[], limitCount = 20) {
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("activities")
      .select(`*, profiles!activities_user_id_fkey (id, username, display_name, avatar_url)`)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (types && types.length > 0) {
      query = query.in("type", types);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getUserActivities error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// REACTIONS
// ─────────────────────────────────────────────────────────────

export async function reactToActivity(
  activityId: string,
  reactionType: "love" | "peak" | "emotional" | "mindblown" | "applause"
) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    // Check if already reacted
    const { data: existing } = await supabase
      .from("activity_reactions")
      .select("id, reaction_type")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Toggle off: remove reaction
        await supabase.from("activity_reactions").delete().eq("id", existing.id);
      } else {
        // Change reaction type
        await supabase.from("activity_reactions").update({ reaction_type: reactionType }).eq("id", existing.id);
      }
    } else {
      // New reaction
      const { error } = await supabase.from("activity_reactions").insert({
        activity_id: activityId,
        user_id: user.id,
        reaction_type: reactionType,
      });
      if (error) throw error;

      // Notify post author
      const { data: activity } = await supabase
        .from("activities")
        .select("user_id")
        .eq("id", activityId)
        .maybeSingle();

      if (activity && activity.user_id !== user.id) {
        await createNotification({
          userId: activity.user_id,
          actorId: user.id,
          type: "reaction",
          activityId,
          reactionType,
        }).catch(() => {});
      }
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    console.warn("reactToActivity error:", error);
    return { success: false, error: "Failed to react to post" };
  }
}

export async function getUserReaction(activityId: string) {
  const user = await verifySession();
  if (!user) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("activity_reactions")
      .select("reaction_type")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.reaction_type || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────

export async function commentOnActivity(activityId: string, content: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Comment cannot be empty" };
  if (trimmed.length > 1000) return { success: false, error: "Comment too long" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("activity_comments").insert({
      activity_id: activityId,
      user_id: user.id,
      content: trimmed,
    });
    if (error) throw error;

    // Notify post author
    const { data: activity } = await supabase
      .from("activities")
      .select("user_id")
      .eq("id", activityId)
      .maybeSingle();

    if (activity && activity.user_id !== user.id) {
      await createNotification({
        userId: activity.user_id,
        actorId: user.id,
        type: "comment",
        activityId,
        commentText: trimmed,
      }).catch(() => {});
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to post comment" };
  }
}

export async function getActivityComments(activityId: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("activity_comments")
      .select(`*, profiles!activity_comments_user_id_fkey (id, username, display_name, avatar_url)`)
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getActivityComments error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// SAVED
// ─────────────────────────────────────────────────────────────

export async function toggleSaveActivity(activityId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("saved_activities")
      .select("activity_id")
      .eq("user_id", user.id)
      .eq("activity_id", activityId)
      .maybeSingle();

    if (existing) {
      await supabase.from("saved_activities").delete().eq("user_id", user.id).eq("activity_id", activityId);
      return { success: true, saved: false };
    } else {
      await supabase.from("saved_activities").insert({ user_id: user.id, activity_id: activityId });
      return { success: true, saved: true };
    }
  } catch (error: any) {
    return { success: false, error: "Failed to save post" };
  }
}

export async function getSavedActivities(limitCount = 20) {
  const user = await verifySession();
  if (!user) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_activities")
      .select(`saved_at, activities (*, profiles!activities_user_id_fkey (id, username, display_name, avatar_url))`)
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return (data || []).map((s) => s.activities).filter(Boolean);
  } catch (error) {
    console.warn("getSavedActivities error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// POLLS
// ─────────────────────────────────────────────────────────────

export async function castPollVoteAction(activityId: string, optionIndex: number) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    // One vote per user per poll
    const { data: existing } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return { success: false, error: "Already voted on this poll" };

    await supabase.from("poll_votes").insert({
      activity_id: activityId,
      user_id: user.id,
      option_index: optionIndex,
    });

    // Update poll totalVotes in activity
    const { data: activity } = await supabase
      .from("activities")
      .select("poll")
      .eq("id", activityId)
      .single();

    if (activity?.poll) {
      const updatedPoll = { ...activity.poll, totalVotes: (activity.poll.totalVotes || 0) + 1 };
      await supabase.from("activities").update({ poll: updatedPoll }).eq("id", activityId);
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to cast vote" };
  }
}

export async function getPollVote(activityId: string) {
  const user = await verifySession();
  if (!user) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.option_index ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────

export async function reportActivityAction(activityId: string, reason: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    await supabase.from("reports").insert({
      reporter_id: user.id,
      activity_id: activityId,
      reason,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to report post" };
  }
}

// ─────────────────────────────────────────────────────────────
// HASHTAG FEED
// ─────────────────────────────────────────────────────────────

export async function fetchHashtagFeedAction(tag: string, cursor?: string, limit = 20) {
  try {
    const supabase = createServiceClient();
    const cleanTag = tag.replace(/^#/, "").toLowerCase();

    const { data: hashtag } = await supabase
      .from("hashtags")
      .select("id")
      .eq("tag", cleanTag)
      .maybeSingle();

    if (!hashtag) return { activities: [], nextCursor: null };

    let query = supabase
      .from("activity_hashtags")
      .select(
        `activities!inner (
          *,
          profiles!activities_user_id_fkey (id, username, display_name, avatar_url)
        )`
      )
      .eq("hashtag_id", hashtag.id)
      .is("activities.deleted_at", null)
      .order("activities.created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("activities.created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const activities = (data || []).map((r: any) => r.activities).slice(0, limit);
    const nextCursor =
      (data || []).length > limit ? activities[activities.length - 1]?.created_at : null;

    return { activities, nextCursor };
  } catch (error) {
    console.warn("fetchHashtagFeedAction error:", error);
    return { activities: [], nextCursor: null };
  }
}

// ─────────────────────────────────────────────────────────────
// STORAGE: Post Images
// ─────────────────────────────────────────────────────────────

export async function uploadPostImageServer(base64Data: string, mimeType: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 1 * 1024 * 1024) {
      return { success: false, error: "Post image exceeds 1MB limit" };
    }

    const supabase = await createClient();
    const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("uploadPostImageServer error:", error);
    return { success: false, error: error.message || "Failed to upload image" };
  }
}





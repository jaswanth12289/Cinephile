"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

const PROFILE_QUERIES = process.env.NODE_ENV === "development";

// ─── Refactored Follow / Unfollow Actions ─────────────────────────────────

export async function followUser(targetUserId: string, targetUsername?: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.uid === targetUserId) return { success: false, error: "Cannot follow yourself" };

  try {
    const batch = adminDb.batch();

    const userRef = adminDb.collection("users").doc(session.uid);
    const targetUserRef = adminDb.collection("users").doc(targetUserId);

    // 1. Add to followee's followers subcollection
    const followerDocRef = targetUserRef.collection("followers").doc(session.uid);
    batch.set(followerDocRef, { createdAt: FieldValue.serverTimestamp() });

    // 2. Add to follower's following subcollection
    const followingDocRef = userRef.collection("following").doc(targetUserId);
    batch.set(followingDocRef, { createdAt: FieldValue.serverTimestamp() });

    // 3. Update flat arrays and counters for backward compatibility & direct updates
    batch.update(userRef, {
      following: FieldValue.arrayUnion(targetUserId),
      followingCount: FieldValue.increment(1)
    });
    batch.update(targetUserRef, {
      followers: FieldValue.arrayUnion(session.uid),
      followersCount: FieldValue.increment(1)
    });

    // 4. Write notification
    const notifRef = adminDb.collection("notifications").doc();
    batch.set(notifRef, {
      id: notifRef.id,
      receiverId: targetUserId,
      senderId: session.uid,
      type: "follow",
      read: false,
      createdAt: new Date(),
    });

    await batch.commit();

    if (targetUsername) {
      revalidatePath(`/u/${targetUsername}`);
      revalidatePath(`/user/${targetUsername}`);
    }
    return { success: true };
  } catch (error) {
    console.warn("followUser error:", error);
    return { success: false, error: "Failed to follow user" };
  }
}

export async function unfollowUser(targetUserId: string, targetUsername?: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const batch = adminDb.batch();

    const userRef = adminDb.collection("users").doc(session.uid);
    const targetUserRef = adminDb.collection("users").doc(targetUserId);

    // 1. Delete from followee's followers subcollection
    const followerDocRef = targetUserRef.collection("followers").doc(session.uid);
    batch.delete(followerDocRef);

    // 2. Delete from follower's following subcollection
    const followingDocRef = userRef.collection("following").doc(targetUserId);
    batch.delete(followingDocRef);

    // 3. Update flat arrays and counters
    batch.update(userRef, {
      following: FieldValue.arrayRemove(targetUserId),
      followingCount: FieldValue.increment(-1)
    });
    batch.update(targetUserRef, {
      followers: FieldValue.arrayRemove(session.uid),
      followersCount: FieldValue.increment(-1)
    });

    await batch.commit();

    if (targetUsername) {
      revalidatePath(`/u/${targetUsername}`);
      revalidatePath(`/user/${targetUsername}`);
    }
    return { success: true };
  } catch (error) {
    console.warn("unfollowUser error:", error);
    return { success: false, error: "Failed to unfollow user" };
  }
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const session = await verifySession();
  if (!session) return false;

  try {
    const doc = await adminDb
      .collection("users")
      .doc(session.uid)
      .collection("following")
      .doc(targetUserId)
      .get();
    return doc.exists;
  } catch (error) {
    console.warn("isFollowing error:", error);
    return false;
  }
}

export async function getFollowStatus(targetUserId: string): Promise<{
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}> {
  const session = await verifySession();

  try {
    const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
    const targetData = targetUserDoc.data();

    const followerCount = targetData?.followersCount ?? 0;
    const followingCount = targetData?.followingCount ?? 0;

    let isFollowingVal = false;
    if (session && session.uid !== targetUserId) {
      const followingDoc = await adminDb
        .collection("users")
        .doc(session.uid)
        .collection("following")
        .doc(targetUserId)
        .get();
      isFollowingVal = followingDoc.exists;
    }

    return {
      isFollowing: isFollowingVal,
      followerCount,
      followingCount,
    };
  } catch (error) {
    console.warn("getFollowStatus error:", error);
    return {
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
    };
  }
}

// ─── New Social Layer Actions (Reactions, Comments, Rewatch, Lists) ──────────

/**
 * Stores reactions separately in a subcollection:
 * activities/{activityId}/reactions/{userId} -> { type: reactionType }
 */
export async function reactToActivity(
  activityId: string,
  reactionType: "love" | "peak" | "emotional" | "mindblown" | "applause"
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const reactionRef = adminDb
    .collection("activities")
    .doc(activityId)
    .collection("reactions")
    .doc(session.uid);

  const activityRef = adminDb.collection("activities").doc(activityId);

  try {
    let activityData: any = null;
    let shouldNotify = false;
    let finalReactionType: string | null = reactionType;

    const txStart = performance.now();
    await adminDb.runTransaction(async (transaction) => {
      const activityDoc = await transaction.get(activityRef);
      if (!activityDoc.exists) return;

      activityData = activityDoc.data();
      const reactions = activityData.reactions || {
        love: 0,
        peak: 0,
        emotional: 0,
        mindblown: 0,
        applause: 0,
      };

      const reactionDoc = await transaction.get(reactionRef);

      if (reactionDoc.exists) {
        const oldType = reactionDoc.data()?.type;
        if (oldType === reactionType) {
          // Toggle off
          transaction.delete(reactionRef);
          reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1);
          finalReactionType = null;
        } else {
          // Change type
          transaction.set(reactionRef, {
            type: reactionType,
            userId: session.uid,
            createdAt: new Date(),
          });
          reactions[oldType] = Math.max(0, (reactions[oldType] || 0) - 1);
          reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          shouldNotify = true;
        }
      } else {
        // New reaction
        transaction.set(reactionRef, {
          type: reactionType,
          userId: session.uid,
          createdAt: new Date(),
        });
        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        shouldNotify = true;
      }

      const likesCount = Object.values(reactions).reduce((sum: number, val: any) => sum + (val || 0), 0);

      transaction.update(activityRef, {
        reactions,
        likesCount,
      });
    });

    if (PROFILE_QUERIES) {
      console.log("[PROFILE] reactToActivity transaction:", (performance.now() - txStart).toFixed(2), "ms");
    }

    // Trigger notification if target user is not self
    if (shouldNotify && activityData && activityData.userId !== session.uid && finalReactionType) {
      const notifRef = adminDb.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id,
        receiverId: activityData.userId,
        senderId: session.uid,
        type: "reaction",
        activityId,
        reaction: finalReactionType,
        targetTitle: activityData.mediaSnapshot?.title || "",
        targetPoster: activityData.mediaSnapshot?.posterPath || null,
        targetMediaType: activityData.mediaSnapshot?.mediaType || "movie",
        targetMediaId: activityData.mediaSnapshot?.id || "",
        read: false,
        createdAt: new Date(),
      });
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("reactToActivity error:", error);
    return { success: false, error: "Failed to submit reaction" };
  }
}

/**
 * Adds an inline comment on an activity card.
 * Does NOT generate a new activity in the activities feed.
 */
export async function commentOnActivity(activityId: string, commentText: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (commentText.trim().length === 0) return { success: false, error: "Comment cannot be empty" };
  if (commentText.length > 280) return { success: false, error: "Comment cannot exceed 280 characters" };

  try {
    const commentRef = adminDb
      .collection("activities")
      .doc(activityId)
      .collection("comments")
      .doc();

    await commentRef.set({
      id: commentRef.id,
      userId: session.uid,
      content: commentText,
      createdAt: new Date(),
    });

    // Increment comments count on the activity itself
    await adminDb
      .collection("activities")
      .doc(activityId)
      .update({
        commentsCount: FieldValue.increment(1),
      });

    // Trigger notification if target user is not self
    const activityDoc = await adminDb.collection("activities").doc(activityId).get();
    const activityData = activityDoc.data();
    if (activityData && activityData.userId !== session.uid) {
      const notifRef = adminDb.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id,
        receiverId: activityData.userId,
        senderId: session.uid,
        type: "comment",
        activityId,
        commentText: commentText.length > 80 ? commentText.slice(0, 77) + "..." : commentText,
        targetTitle: activityData.mediaSnapshot?.title || "",
        targetPoster: activityData.mediaSnapshot?.posterPath || null,
        targetMediaType: activityData.mediaSnapshot?.mediaType || "movie",
        targetMediaId: activityData.mediaSnapshot?.id || "",
        read: false,
        createdAt: new Date(),
      });
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("commentOnActivity error:", error);
    return { success: false, error: "Failed to submit comment" };
  }
}

/**
 * Fetches comments for an activity, resolving user display data.
 */
export async function getActivityComments(activityId: string) {
  try {
    const snap = await adminDb
      .collection("activities")
      .doc(activityId)
      .collection("comments")
      .orderBy("createdAt", "asc")
      .get();

    const comments = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await adminDb.collection("users").doc(data.userId).get();
        const userData = userDoc.data();
        return {
          id: doc.id,
          userId: data.userId,
          content: data.content,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          userName: userData?.displayName ?? "Cinephile User",
          userPhoto: userData?.photoURL ?? null,
        };
      })
    );
    return comments;
  } catch (error) {
    console.warn("getActivityComments error:", error);
    return [];
  }
}

// ─── Notifications Management Server Actions ──────────────────────────────

/**
 * Fetches recent notifications for the logged-in user, resolving the sender profile.
 */
export async function getNotifications() {
  const session = await verifySession();
  if (!session) return [];

  try {
    const snap = await adminDb
      .collection("notifications")
      .where("receiverId", "==", session.uid)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const notifications = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        
        // Fetch sender details
        let sender = {
          displayName: "Cinephile User",
          username: "cinephile",
          photoURL: null as string | null,
        };

        if (data.senderId) {
          const userDoc = await adminDb.collection("users").doc(data.senderId).get();
          const userData = userDoc.data();
          if (userData) {
            sender = {
              displayName: userData.displayName ?? "Cinephile User",
              username: userData.username ?? "cinephile",
              photoURL: userData.photoURL ?? null,
            };
          }
        }

        // Fetch activity media snapshot info directly from the flat notification document fields
        const mediaTitle = data.targetTitle || "";
        const mediaType = data.targetMediaType || "movie";
        const mediaId = data.targetMediaId || "";
        const mediaPoster = data.targetPoster || null;

        return {
          id: doc.id,
          receiverId: data.receiverId,
          senderId: data.senderId,
          type: data.type,
          activityId: data.activityId || null,
          reaction: data.reaction || null,
          commentText: data.commentText || null,
          read: data.read || false,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          sender,
          mediaTitle,
          mediaType,
          mediaId,
          mediaPoster,
        };
      })
    );

    return notifications;
  } catch (error) {
    console.warn("getNotifications error:", error);
    return [];
  }
}

/**
 * Marks all unread notifications as read for the logged-in user.
 */
export async function markNotificationsAsRead() {
  const session = await verifySession();
  if (!session) return { success: false };

  try {
    const snap = await adminDb
      .collection("notifications")
      .where("receiverId", "==", session.uid)
      .where("read", "==", false)
      .get();

    if (snap.empty) return { success: true };

    const batch = adminDb.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.warn("markNotificationsAsRead error:", error);
    return { success: false };
  }
}

/**
 * Gets the count of unread notifications for the logged-in user.
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  const session = await verifySession();
  if (!session) return 0;

  try {
    const snap = await adminDb
      .collection("notifications")
      .where("receiverId", "==", session.uid)
      .where("read", "==", false)
      .count()
      .get();
    return snap.data().count;
  } catch (error) {
    console.warn("getUnreadNotificationsCount error:", error);
    return 0;
  }
}


/**
 * Increments the rewatch count of a title and logs a rewatched activity card.
 * Embedded mediaSnapshot avoids TMDB network overhead during feed loading.
 */
export async function triggerRewatch(mediaId: string, mediaType: "movie" | "tv") {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    // 1. Fetch TMDB details once to embed a mediaSnapshot
    let mediaDetails: any = null;
    if (mediaType === "tv") {
      mediaDetails = await getTVDetails(mediaId).catch(() => null);
    } else {
      mediaDetails = await getMovieDetails(mediaId).catch(() => null);
    }

    if (!mediaDetails) return { success: false, error: "Media details not found on TMDB" };

    const title = mediaDetails.title || mediaDetails.name;
    const mediaSnapshot = {
      id: mediaId,
      title,
      posterPath: mediaDetails.poster_path || null,
      backdropPath: mediaDetails.backdrop_path || null,
      rating: mediaDetails.vote_average || 0,
      releaseYear: mediaDetails.release_date?.split("-")[0] || mediaDetails.first_air_date?.split("-")[0] || "",
      mediaType,
    };

    // 2. Increment rewatchCount in tracking record
    const trackDocId = `${session.uid}_${mediaId}`;
    const trackingRef = adminDb.collection("watchTracking").doc(trackDocId);
    
    await trackingRef.set(
      {
        id: trackDocId,
        userId: session.uid,
        mediaId,
        mediaType,
        status: "watched",
        rewatchCount: FieldValue.increment(1),
        watchDate: new Date(),
      },
      { merge: true }
    );

    // 3. Log a "rewatched" event to the activities feed
    const activityRef = adminDb.collection("activities").doc();
    await activityRef.set({
      id: activityRef.id,
      userId: session.uid,
      type: "rewatched",
      movieId: mediaType === "movie" ? mediaId : null,
      tvId: mediaType === "tv" ? mediaId : null,
      rating: null,
      reviewText: null,
      containsSpoilers: false,
      createdAt: new Date(),
      mediaSnapshot,
    });

    revalidatePath("/feed");
    revalidatePath(`/${mediaType}/${mediaId}`);
    return { success: true };
  } catch (error) {
    console.warn("triggerRewatch error:", error);
    return { success: false, error: "Failed to trigger rewatch" };
  }
}

/**
 * Creates a custom curated list and logs a list_created activity card.
 */
export async function createCustomList(
  title: string,
  description: string,
  mediaIds: string[],
  mediaType: "movie" | "tv"
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (!title.trim()) return { success: false, error: "Title is required" };

  try {
    const listRef = adminDb.collection("lists").doc();
    await listRef.set({
      id: listRef.id,
      userId: session.uid,
      title,
      description,
      isPublic: true,
      likesCount: 0,
      createdAt: new Date(),
    });

    const batch = adminDb.batch();
    mediaIds.forEach((mediaId, idx) => {
      const itemRef = adminDb.collection("listItems").doc();
      batch.set(itemRef, {
        id: itemRef.id,
        listId: listRef.id,
        mediaId,
        mediaType,
        order: idx,
      });
    });
    await batch.commit();

    // Fetch poster metadata for the first movie in the list to act as list cover image
    let mediaSnapshot = null;
    if (mediaIds.length > 0) {
      const firstId = mediaIds[0];
      const mediaDetails = mediaType === "tv" 
        ? await getTVDetails(firstId).catch(() => null)
        : await getMovieDetails(firstId).catch(() => null);
      
      if (mediaDetails) {
        mediaSnapshot = {
          id: firstId,
          title: mediaDetails.title || mediaDetails.name,
          posterPath: mediaDetails.poster_path || null,
          backdropPath: mediaDetails.backdrop_path || null,
          rating: mediaDetails.vote_average || 0,
          releaseYear: mediaDetails.release_date?.split("-")[0] || mediaDetails.first_air_date?.split("-")[0] || "",
          mediaType,
        };
      }
    }

    // Log list_created activity
    const activityRef = adminDb.collection("activities").doc();
    await activityRef.set({
      id: activityRef.id,
      userId: session.uid,
      type: "list_created",
      movieId: mediaType === "movie" && mediaIds.length > 0 ? mediaIds[0] : null,
      tvId: mediaType === "tv" && mediaIds.length > 0 ? mediaIds[0] : null,
      rating: null,
      reviewText: `created list: ${title}`,
      containsSpoilers: false,
      createdAt: new Date(),
      listTitle: title,
      mediaSnapshot,
    });

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("createCustomList error:", error);
    return { success: false, error: "Failed to create list" };
  }
}

export async function fetchFeedActivitiesAction(
  uid: string,
  lastDocId?: string,
  limitNum = 10
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated", activities: [] };

  try {
    const startTime = performance.now();
    const userDoc = await adminDb.collection("users").doc(uid).get();

    const userData = userDoc.data();
    const followingIds = userData?.following || [];
    const targetUserIds = [uid, ...followingIds];

    let query;
    if (followingIds.length > 0) {
      query = adminDb
        .collection("activities")
        .where("userId", "in", targetUserIds.slice(0, 30))
        .orderBy("createdAt", "desc");
    } else {
      query = adminDb
        .collection("activities")
        .orderBy("createdAt", "desc");
    }

    if (lastDocId) {
      const lastDoc = await adminDb.collection("activities").doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snap = await query.limit(limitNum).get();
    
    const rawActivities = snap.docs
      .map((doc) => {
        const data = doc.data();
        let normalizedType = data.type;
        if (data.type === "watch" || data.type === "rate") {
          normalizedType = "watched";
        } else if (data.type === "review") {
          normalizedType = "reviewed";
        }

        const isoDateStr = data.createdAt?.toDate 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt instanceof Date 
              ? data.createdAt.toISOString() 
              : (data.createdAt?._seconds 
                  ? new Date(data.createdAt._seconds * 1000).toISOString() 
                  : new Date().toISOString()));

        return {
          id: doc.id,
          userId: data.userId || data.actorId || "",
          type: normalizedType,
          movieId: data.movieId || data.mediaId || null,
          tvId: data.tvId || null,
          rating: data.rating || null,
          reviewText: data.reviewText || null,
          containsSpoilers: data.containsSpoilers || data.hasSpoilers || false,
          createdAt: isoDateStr,
          listTitle: data.listTitle || null,
          listId: data.listId || null,
          activitySnapshot: data.activitySnapshot || null,
          mediaSnapshot: data.mediaSnapshot || null,
          commentsCount: data.commentsCount || 0,
          reactions: data.reactions || null,
          likesCount: data.likesCount || 0,
        };
      })
      .filter((act) => act.type && ["watched", "reviewed", "rewatched", "finished_series", "watchlist_added", "list_created"].includes(act.type));

    const actorIds = Array.from(new Set(rawActivities.map((act) => act.userId).filter(Boolean)));
    
    const actorDocs = await Promise.all(
      actorIds.map((aid) => adminDb.collection("users").doc(aid).get())
    );

    const actorMap: Record<string, any> = {};
    actorDocs.forEach((doc) => {
      if (doc.exists) {
        actorMap[doc.id] = doc.data();
      }
    });

    const trackingMap = new Map<string, any>();
    const trackingRefs = rawActivities
      .map((act) => {
        const mediaId = act.movieId || act.tvId;
        return mediaId ? adminDb.collection("watchTracking").doc(`${session.uid}_${mediaId}`) : null;
      })
      .filter(Boolean) as FirebaseFirestore.DocumentReference[];

    const trackingDocs = trackingRefs.length > 0 ? await adminDb.getAll(...trackingRefs) : [];
    trackingDocs.forEach((doc) => {
      if (doc.exists) {
        trackingMap.set(doc.id, doc.data());
      }
    });

    const userReactionMap = new Map<string, string>();
    const reactionRefs = rawActivities.map((act) =>
      adminDb.collection("activities").doc(act.id).collection("reactions").doc(session.uid)
    );

    const userReactionDocs = await adminDb.getAll(...reactionRefs);
    userReactionDocs.forEach((doc) => {
      if (doc.exists) {
        const activityId = doc.ref.parent.parent?.id;
        if (activityId) {
          userReactionMap.set(activityId, doc.data()?.type);
        }
      }
    });

    const resolved = await Promise.all(
      rawActivities.map(async (act) => {
        try {
          let actor = {
            displayName: "Cinephile User",
            username: "cinephile",
            photoURL: null as string | null,
          };

          const cachedActor = actorMap[act.userId];
          if (cachedActor) {
            actor = {
              displayName: cachedActor.displayName ?? "Cinephile User",
              username: cachedActor.username ?? "cinephile",
              photoURL: cachedActor.photoURL ?? null,
            };
          }

          let mediaSnapshot = act.mediaSnapshot;
          const mediaId = act.movieId || act.tvId;
          if (!mediaSnapshot && mediaId) {
            const isTV = !!act.tvId;
            const details = isTV
              ? await getTVDetails(mediaId).catch(() => null)
              : await getMovieDetails(mediaId).catch(() => null);
            if (details) {
              mediaSnapshot = {
                id: mediaId,
                title: details.title || details.name,
                posterPath: details.poster_path || null,
                backdropPath: details.backdrop_path || null,
                rating: details.vote_average || 0,
                releaseYear: details.release_date?.split("-")[0] || details.first_air_date?.split("-")[0] || "",
                mediaType: isTV ? "tv" : "movie",
              };
            }
          }

          const reactions = act.reactions || {
            love: 0,
            peak: 0,
            emotional: 0,
            mindblown: 0,
            applause: 0,
          };

          const userActiveReaction = userReactionMap.get(act.id) || null;

          let initialSaved = false;
          if (mediaId) {
            initialSaved = trackingMap.get(`${session.uid}_${mediaId}`)?.status === "want_to_watch";
          }

          return {
            activity: {
              ...act,
              mediaSnapshot,
            },
            actor,
            reactions,
            userActiveReaction,
            initialSaved,
          };
        } catch (e) {
          return {
            activity: act,
            actor: { displayName: "Cinephile User", username: "cinephile", photoURL: null },
            reactions: { love: 0, peak: 0, emotional: 0, mindblown: 0, applause: 0 },
            userActiveReaction: null,
            initialSaved: false,
          };
        }
      })
    );

    const nextLastDocId = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;

    if (PROFILE_QUERIES) {
      console.log("[PROFILE] Feed query:", (performance.now() - startTime).toFixed(2), "ms");
    }

    return {
      success: true,
      activities: resolved,
      lastDocId: nextLastDocId
    };
  } catch (error) {
    console.warn("fetchFeedActivitiesAction error:", error);
    return { success: false, error: "Failed to load activities", activities: [] };
  }
}

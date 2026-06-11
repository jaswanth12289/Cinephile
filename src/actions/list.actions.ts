"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

// Helper: convert text to slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")          // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
}

// Helper: generate a unique slug for lists
async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title) || "list";
  let slug = baseSlug;
  let collision = true;
  let counter = 0;
  
  while (collision && counter < 5) {
    const checkSnap = await adminDb
      .collection("lists")
      .where("slug", "==", slug)
      .limit(1)
      .get();
      
    if (checkSnap.empty) {
      collision = false;
    } else {
      counter++;
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      slug = `${baseSlug}-${randomSuffix}`;
    }
  }
  return slug;
}

// Helper: fetch media runtime from TMDB
async function fetchItemRuntime(tmdbId: number, mediaType: "movie" | "tv"): Promise<number> {
  try {
    if (mediaType === "tv") {
      const details = await getTVDetails(tmdbId.toString()).catch(() => null);
      if (!details) return 45;
      const episodeRuntime = details.episode_run_time?.[0] || details.last_episode_to_air?.runtime || 45;
      const totalEpisodes = details.number_of_episodes || 10;
      return episodeRuntime * totalEpisodes;
    } else {
      const details = await getMovieDetails(tmdbId.toString()).catch(() => null);
      if (!details) return 120;
      return details.runtime || 120;
    }
  } catch (e) {
    console.warn(`[Runtime Fetch] Failed for ${mediaType} ${tmdbId}:`, e);
    return 120;
  }
}

// Type definitions for List input
export interface ListItemInput {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseYear: string;
  note?: {
    text: string;
    imageUrl?: string;
  } | string;
}

export interface CollaboratorInput {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

export async function createList(data: {
  title: string;
  description: string;
  visibility: "public" | "private" | "unlisted";
  type: "ranking" | "collection" | "watchlist";
  tags: string[];
  collaborators: CollaboratorInput[];
  containsSpoilers: boolean;
  coverItem?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    backdropPath: string | null;
  } | null;
  items: ListItemInput[];
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (!data.title.trim()) return { success: false, error: "List title is required" };

  try {
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const userData = userDoc.data();
    if (!userData) return { success: false, error: "User profile not found" };

    const listRef = adminDb.collection("lists").doc();
    const slug = await generateUniqueSlug(data.title);

    // Sum up runtime
    let totalMinutes = 0;
    const itemsWithRuntime = await Promise.all(
      data.items.map(async (item, idx) => {
        const runtime = await fetchItemRuntime(item.tmdbId, item.mediaType);
        totalMinutes += runtime;
        return {
          ...item,
          order: idx + 1,
          runtimeMinutes: runtime,
        };
      })
    );
    const estimatedWatchTimeHours = Math.round(totalMinutes / 60);

    // Cover settings
    let coverTitle = data.coverItem?.title || null;
    let coverTmdbId = data.coverItem?.tmdbId || null;
    let coverMediaType = data.coverItem?.mediaType || null;
    let backdropPath = data.coverItem?.backdropPath || null;

    // Default to first item backdrop if not specified
    if (!backdropPath && itemsWithRuntime.length > 0) {
      const first = itemsWithRuntime[0];
      coverTitle = first.title;
      coverTmdbId = first.tmdbId;
      coverMediaType = first.mediaType;
      // Fetch details to get backdrop
      try {
        const details = first.mediaType === "tv" 
          ? await getTVDetails(first.tmdbId.toString()) 
          : await getMovieDetails(first.tmdbId.toString());
        backdropPath = details.backdrop_path || null;
      } catch (e) {
        backdropPath = null;
      }
    }

    const first4Posters = itemsWithRuntime.slice(0, 4).map((i) => i.posterPath).filter(Boolean) as string[];
    const featuredItems = itemsWithRuntime.slice(0, 4).map((i) => ({
      title: i.title,
      posterPath: i.posterPath,
    }));

    const listDoc = {
      id: listRef.id,
      ownerId: session.uid,
      ownerUsername: userData.username,
      ownerName: userData.displayName || "Cinephile User",
      ownerPhoto: userData.photoURL || null,
      title: data.title,
      description: data.description,
      slug,
      visibility: data.visibility,
      type: data.type,
      tags: data.tags || [],
      collaborators: data.collaborators || [],
      isPinned: false,
      containsSpoilers: data.containsSpoilers || false,
      coverTitle,
      coverTmdbId,
      coverMediaType,
      backdropPath,
      likesCount: 0,
      commentsCount: 0,
      itemsCount: itemsWithRuntime.length,
      viewsCount: 0,
      forksCount: 0,
      savesCount: 0,
      shareCount: 0,
      estimatedWatchTimeHours,
      featuredItems,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy: {
        uid: session.uid,
        username: userData.username,
      },
      forkedFrom: null,
    };

    const batch = adminDb.batch();
    batch.set(listRef, listDoc);

    // Save subcollection items
    itemsWithRuntime.forEach((item) => {
      const itemDocId = `${item.mediaType}_${item.tmdbId}`;
      const itemRef = listRef.collection("items").doc(itemDocId);
      batch.set(itemRef, {
        id: itemDocId,
        order: item.order,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        releaseYear: item.releaseYear,
        runtimeMinutes: item.runtimeMinutes,
        note: item.note || "",
      });
    });

    // Write social activity if public
    if (data.visibility === "public") {
      const activityRef = adminDb.collection("activities").doc();
      batch.set(activityRef, {
        id: activityRef.id,
        userId: session.uid,
        type: "list_created",
        listId: listRef.id,
        createdAt: new Date(),
        activitySnapshot: {
          title: data.title,
          description: data.description,
          type: data.type,
          tags: data.tags || [],
          posterIds: first4Posters,
          featuredItems,
          itemsCount: itemsWithRuntime.length,
        },
      });
    }

    await batch.commit();
    revalidatePath("/lists");
    revalidatePath(`/user/${userData.username}/lists`);
    return { success: true, slug };
  } catch (error) {
    console.warn("createList error:", error);
    return { success: false, error: "Failed to create list" };
  }
}

export async function updateList(
  listId: string,
  data: {
    title: string;
    description: string;
    visibility: "public" | "private" | "unlisted";
    type: "ranking" | "collection" | "watchlist";
    tags: string[];
    collaborators: CollaboratorInput[];
    containsSpoilers: boolean;
    coverItem?: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      backdropPath: string | null;
    } | null;
    items: ListItemInput[];
  }
) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const isOwner = listData?.ownerId === session.uid;
    const isCollaborator = listData?.collaborators?.some((c: any) => c.uid === session.uid);

    if (!isOwner && !isCollaborator) {
      return { success: false, error: "Unauthorized. Only owner or collaborators can edit." };
    }

    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const userData = userDoc.data();
    if (!userData) return { success: false, error: "User profile not found" };

    // Regenerate slug if title changed (and isOwner)
    let slug = listData?.slug;
    if (isOwner && data.title !== listData?.title) {
      slug = await generateUniqueSlug(data.title);
    }

    // Sum up runtime
    let totalMinutes = 0;
    const itemsWithRuntime = await Promise.all(
      data.items.map(async (item, idx) => {
        const runtime = await fetchItemRuntime(item.tmdbId, item.mediaType);
        totalMinutes += runtime;
        return {
          ...item,
          order: idx + 1,
          runtimeMinutes: runtime,
        };
      })
    );
    const estimatedWatchTimeHours = Math.round(totalMinutes / 60);

    // Cover settings
    let coverTitle = data.coverItem?.title || null;
    let coverTmdbId = data.coverItem?.tmdbId || null;
    let coverMediaType = data.coverItem?.mediaType || null;
    let backdropPath = data.coverItem?.backdropPath || null;

    if (!backdropPath && itemsWithRuntime.length > 0) {
      const first = itemsWithRuntime[0];
      coverTitle = first.title;
      coverTmdbId = first.tmdbId;
      coverMediaType = first.mediaType;
      try {
        const details = first.mediaType === "tv" 
          ? await getTVDetails(first.tmdbId.toString()) 
          : await getMovieDetails(first.tmdbId.toString());
        backdropPath = details.backdrop_path || null;
      } catch (e) {
        backdropPath = null;
      }
    }

    const first4Posters = itemsWithRuntime.slice(0, 4).map((i) => i.posterPath).filter(Boolean) as string[];
    const featuredItems = itemsWithRuntime.slice(0, 4).map((i) => ({
      title: i.title,
      posterPath: i.posterPath,
    }));

    // Update parent document fields
    await listRef.update({
      title: data.title,
      description: data.description,
      slug,
      visibility: data.visibility,
      type: data.type,
      tags: data.tags || [],
      collaborators: data.collaborators || [],
      containsSpoilers: data.containsSpoilers || false,
      coverTitle,
      coverTmdbId,
      coverMediaType,
      backdropPath,
      itemsCount: itemsWithRuntime.length,
      estimatedWatchTimeHours,
      featuredItems,
      updatedAt: new Date(),
      lastEditedBy: {
        uid: session.uid,
        username: userData.username,
      },
    });

    // UPSERT items subcollection strategy
    const existingItemsSnap = await listRef.collection("items").get();
    const existingItemsMap = new Map();
    existingItemsSnap.docs.forEach((doc) => {
      existingItemsMap.set(doc.id, doc.data());
    });

    const incomingIdsSet = new Set();
    const batch = adminDb.batch();

    itemsWithRuntime.forEach((item) => {
      const itemDocId = `${item.mediaType}_${item.tmdbId}`;
      incomingIdsSet.add(itemDocId);
      const itemRef = listRef.collection("items").doc(itemDocId);

      // Upsert: set details
      batch.set(itemRef, {
        id: itemDocId,
        order: item.order,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        releaseYear: item.releaseYear,
        runtimeMinutes: item.runtimeMinutes,
        note: item.note || "",
      }, { merge: true });
    });

    // Delete missing items
    existingItemsSnap.docs.forEach((doc) => {
      if (!incomingIdsSet.has(doc.id)) {
        batch.delete(doc.ref);
      }
    });

    // Update historical feed activities if visibility changed or title changed
    const activityQuery = await adminDb
      .collection("activities")
      .where("listId", "==", listId)
      .get();

    activityQuery.docs.forEach((actDoc) => {
      // If visibility becomes private, delete activity
      if (data.visibility !== "public") {
        batch.delete(actDoc.ref);
      } else {
        // Update snapshot
        batch.update(actDoc.ref, {
          activitySnapshot: {
            title: data.title,
            description: data.description,
            type: data.type,
            tags: data.tags || [],
            posterIds: first4Posters,
            featuredItems,
            itemsCount: itemsWithRuntime.length,
          },
        });
      }
    });

    // If list changed from non-public to public, log a new feed activity if none exists
    if (data.visibility === "public" && listData?.visibility !== "public" && activityQuery.empty) {
      const activityRef = adminDb.collection("activities").doc();
      batch.set(activityRef, {
        id: activityRef.id,
        userId: listData?.ownerId || session.uid,
        type: "list_created",
        listId,
        createdAt: new Date(),
        activitySnapshot: {
          title: data.title,
          description: data.description,
          type: data.type,
          tags: data.tags || [],
          posterIds: first4Posters,
          featuredItems,
          itemsCount: itemsWithRuntime.length,
        },
      });
    }

    await batch.commit();
    revalidatePath("/lists");
    revalidatePath(`/list/${slug}`);
    revalidatePath(`/user/${listData?.ownerUsername}/lists`);
    return { success: true, slug };
  } catch (error) {
    console.warn("updateList error:", error);
    return { success: false, error: "Failed to update list" };
  }
}

export async function deleteList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    if (listData?.ownerId !== session.uid) {
      return { success: false, error: "Only the owner can delete lists." };
    }

    const batch = adminDb.batch();

    // 1. Delete items subcollection
    const itemsSnap = await listRef.collection("items").get();
    itemsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Delete likes subcollection
    const likesSnap = await listRef.collection("likes").get();
    likesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Delete comments subcollection
    const commentsSnap = await listRef.collection("comments").get();
    commentsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 4. Delete associated activities
    const activityQuery = await adminDb
      .collection("activities")
      .where("listId", "==", listId)
      .get();
    activityQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 5. Delete bookmarks for all users (cleanup users savedList markers)
    // Note: In Firestore, finding every user's savedLists/{listId} would require a collectionGroup query
    // Let's perform a collectionGroup delete query on savedLists
    const savedSnap = await adminDb
      .collectionGroup("savedLists")
      .where("listId", "==", listId)
      .get();
    savedSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 6. Delete parent list document
    batch.delete(listRef);

    await batch.commit();
    revalidatePath("/lists");
    revalidatePath(`/user/${listData?.ownerUsername}/lists`);
    return { success: true };
  } catch (error) {
    console.warn("deleteList error:", error);
    return { success: false, error: "Failed to delete list" };
  }
}

export async function getListBySlug(slug: string) {
  try {
    const snap = await adminDb
      .collection("lists")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();

    // Convert Firestore Dates to JS Dates/ISO string
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
    } as any;
  } catch (error) {
    console.warn("getListBySlug error:", error);
    return null;
  }
}

export async function getListItems(listId: string) {
  try {
    const snap = await adminDb
      .collection("lists")
      .doc(listId)
      .collection("items")
      .orderBy("order", "asc")
      .get();

    return snap.docs.map((doc) => doc.data()) as any[];
  } catch (error) {
    console.warn("getListItems error:", error);
    return [];
  }
}

export async function likeList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const likeRef = listRef.collection("likes").doc(session.uid);
    const likeDoc = await likeRef.get();

    if (likeDoc.exists) {
      return { success: true }; // Already liked
    }

    const batch = adminDb.batch();
    batch.set(likeRef, {
      userId: session.uid,
      createdAt: new Date(),
    });
    batch.update(listRef, {
      likesCount: FieldValue.increment(1),
    });

    // Trigger notification if receiver is not self
    if (listData && listData.ownerId !== session.uid) {
      const notifRef = adminDb.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        receiverId: listData.ownerId,
        senderId: session.uid,
        type: "list_like",
        activityId: listId,
        targetTitle: listData.title,
        read: false,
        createdAt: new Date(),
      });
    }

    await batch.commit();
    revalidatePath(`/list/${listData?.slug}`);
    return { success: true };
  } catch (error) {
    console.warn("likeList error:", error);
    return { success: false, error: "Failed to like list" };
  }
}

export async function unlikeList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const likeRef = listRef.collection("likes").doc(session.uid);
    const likeDoc = await likeRef.get();

    if (!likeDoc.exists) {
      return { success: true }; // Already unliked
    }

    const batch = adminDb.batch();
    batch.delete(likeRef);
    batch.update(listRef, {
      likesCount: FieldValue.increment(-1),
    });

    // Remove notification if exists
    const notifQuery = await adminDb
      .collection("notifications")
      .where("receiverId", "==", listData?.ownerId)
      .where("senderId", "==", session.uid)
      .where("type", "==", "list_like")
      .where("activityId", "==", listId)
      .get();
    notifQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    revalidatePath(`/list/${listData?.slug}`);
    return { success: true };
  } catch (error) {
    console.warn("unlikeList error:", error);
    return { success: false, error: "Failed to unlike list" };
  }
}

export async function commentOnList(listId: string, content: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (content.trim().length === 0) return { success: false, error: "Comment content is empty" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const commentRef = listRef.collection("comments").doc();

    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const userData = userDoc.data();

    const commentData = {
      id: commentRef.id,
      userId: session.uid,
      userName: userData?.displayName || "Cinephile User",
      userPhoto: userData?.photoURL || null,
      content,
      createdAt: new Date(),
    };

    const batch = adminDb.batch();
    batch.set(commentRef, commentData);
    batch.update(listRef, {
      commentsCount: FieldValue.increment(1),
    });

    // Trigger notification to owner if receiver is not self
    if (listData && listData.ownerId !== session.uid) {
      const notifRef = adminDb.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        receiverId: listData.ownerId,
        senderId: session.uid,
        type: "list_comment",
        activityId: listId,
        targetTitle: listData.title,
        commentText: content.length > 80 ? content.slice(0, 77) + "..." : content,
        read: false,
        createdAt: new Date(),
      });
    }

    await batch.commit();
    revalidatePath(`/list/${listData?.slug}`);
    return { success: true };
  } catch (error) {
    console.warn("commentOnList error:", error);
    return { success: false, error: "Failed to post comment" };
  }
}

export async function getListComments(listId: string) {
  try {
    const snap = await adminDb
      .collection("lists")
      .doc(listId)
      .collection("comments")
      .orderBy("createdAt", "asc")
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    }) as any[];
  } catch (error) {
    console.warn("getListComments error:", error);
    return [];
  }
}

export async function saveList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const saveRef = adminDb.collection("users").doc(session.uid).collection("savedLists").doc(listId);
    const saveDoc = await saveRef.get();

    if (saveDoc.exists) return { success: true };

    const batch = adminDb.batch();
    batch.set(saveRef, {
      listId,
      savedAt: new Date(),
    });
    batch.update(listRef, {
      savesCount: FieldValue.increment(1),
    });

    await batch.commit();
    revalidatePath(`/list/${listData?.slug}`);
    revalidatePath(`/user/${listData?.ownerUsername}/lists`);
    return { success: true };
  } catch (error) {
    console.warn("saveList error:", error);
    return { success: false, error: "Failed to save list" };
  }
}

export async function unsaveList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    const saveRef = adminDb.collection("users").doc(session.uid).collection("savedLists").doc(listId);
    const saveDoc = await saveRef.get();

    if (!saveDoc.exists) return { success: true };

    const batch = adminDb.batch();
    batch.delete(saveRef);
    batch.update(listRef, {
      savesCount: FieldValue.increment(-1),
    });

    await batch.commit();
    revalidatePath(`/list/${listData?.slug}`);
    revalidatePath(`/user/${listData?.ownerUsername}/lists`);
    return { success: true };
  } catch (error) {
    console.warn("unsaveList error:", error);
    return { success: false, error: "Failed to unsave list" };
  }
}

export async function forkList(listId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const originalRef = adminDb.collection("lists").doc(listId);
    const originalDoc = await originalRef.get();
    if (!originalDoc.exists) return { success: false, error: "Original list not found" };

    const originalData = originalDoc.data();
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const userData = userDoc.data();

    if (!userData) return { success: false, error: "User profile not found" };

    // Create unique slug for fork
    const forkTitle = `${originalData?.title} (${userData.displayName || "Curator"} Edition)`;
    const slug = await generateUniqueSlug(forkTitle);

    const itemsSnap = await originalRef.collection("items").orderBy("order", "asc").get();
    const items = itemsSnap.docs.map((doc) => doc.data());

    const forkRef = adminDb.collection("lists").doc();

    const listDoc = {
      id: forkRef.id,
      ownerId: session.uid,
      ownerUsername: userData.username,
      ownerName: userData.displayName || "Cinephile User",
      ownerPhoto: userData.photoURL || null,
      title: forkTitle,
      description: `Forked from @${originalData?.ownerUsername}'s list: ${originalData?.title}.\n\n${originalData?.description || ""}`,
      slug,
      visibility: originalData?.visibility || "public",
      type: originalData?.type || "collection",
      tags: originalData?.tags || [],
      collaborators: [], // Reset collaborators on fork
      isPinned: false,
      containsSpoilers: originalData?.containsSpoilers || false,
      coverTitle: originalData?.coverTitle || null,
      coverTmdbId: originalData?.coverTmdbId || null,
      coverMediaType: originalData?.coverMediaType || null,
      backdropPath: originalData?.backdropPath || null,
      likesCount: 0,
      commentsCount: 0,
      itemsCount: items.length,
      viewsCount: 0,
      forksCount: 0,
      savesCount: 0,
      shareCount: 0,
      estimatedWatchTimeHours: originalData?.estimatedWatchTimeHours || 0,
      featuredItems: originalData?.featuredItems || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy: {
        uid: session.uid,
        username: userData.username,
      },
      forkedFrom: {
        listId: originalRef.id,
        ownerUsername: originalData?.ownerUsername,
        ownerName: originalData?.ownerName || "Cinephile User",
      },
    };

    const batch = adminDb.batch();
    batch.set(forkRef, listDoc);

    // Copy items
    items.forEach((item) => {
      const itemDocId = `${item.mediaType}_${item.tmdbId}`;
      const itemRef = forkRef.collection("items").doc(itemDocId);
      batch.set(itemRef, {
        id: itemDocId,
        order: item.order,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        releaseYear: item.releaseYear,
        runtimeMinutes: item.runtimeMinutes || 120,
        note: item.note || "",
      });
    });

    // Increment original forksCount
    batch.update(originalRef, {
      forksCount: FieldValue.increment(1),
    });

    // Write activity if public
    if (listDoc.visibility === "public") {
      const activityRef = adminDb.collection("activities").doc();
      batch.set(activityRef, {
        id: activityRef.id,
        userId: session.uid,
        type: "list_created",
        listId: forkRef.id,
        createdAt: new Date(),
        activitySnapshot: {
          title: forkTitle,
          description: listDoc.description,
          type: listDoc.type,
          tags: listDoc.tags,
          posterIds: originalData?.featuredItems?.slice(0, 4).map((i: any) => i.posterPath).filter(Boolean) || [],
          featuredItems: originalData?.featuredItems || [],
          itemsCount: items.length,
        },
      });
    }

    await batch.commit();
    revalidatePath("/lists");
    revalidatePath(`/user/${userData.username}/lists`);
    return { success: true, slug };
  } catch (error) {
    console.warn("forkList error:", error);
    return { success: false, error: "Failed to fork list" };
  }
}

export async function togglePinList(listId: string, isPinned: boolean) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const listRef = adminDb.collection("lists").doc(listId);
    const listDoc = await listRef.get();
    if (!listDoc.exists) return { success: false, error: "List not found" };

    const listData = listDoc.data();
    if (listData?.ownerId !== session.uid) {
      return { success: false, error: "Only the list owner can pin it." };
    }

    // If pinning, unpin other lists of the user first (only 1 pinned list allowed)
    if (isPinned) {
      const pinnedQuery = await adminDb
        .collection("lists")
        .where("ownerId", "==", session.uid)
        .where("isPinned", "==", true)
        .get();

      const batch = adminDb.batch();
      pinnedQuery.docs.forEach((doc) => {
        batch.update(doc.ref, { isPinned: false });
      });
      batch.update(listRef, { isPinned: true });
      await batch.commit();
    } else {
      await listRef.update({ isPinned: false });
    }

    revalidatePath(`/user/${listData?.ownerUsername}/lists`);
    revalidatePath(`/user/${listData?.ownerUsername}`);
    return { success: true };
  } catch (error) {
    console.warn("togglePinList error:", error);
    return { success: false, error: "Failed to pin list" };
  }
}

export async function incrementListViews(listId: string) {
  try {
    const listRef = adminDb.collection("lists").doc(listId);
    await listRef.update({
      viewsCount: FieldValue.increment(1),
    });
    return { success: true };
  } catch (error) {
    console.warn("incrementListViews error:", error);
    return { success: false, error: "Failed to increment views" };
  }
}

export async function incrementListShares(listId: string) {
  try {
    const listRef = adminDb.collection("lists").doc(listId);
    await listRef.update({
      shareCount: FieldValue.increment(1),
    });
    return { success: true };
  } catch (error) {
    console.warn("incrementListShares error:", error);
    return { success: false, error: "Failed to increment shares" };
  }
}

export async function getLists(sortBy: "likes" | "newest" = "newest", tagFilter?: string) {
  try {
    let query = adminDb.collection("lists").where("visibility", "==", "public");

    if (tagFilter) {
      query = query.where("tags", "array-contains", tagFilter);
    }

    const snap = await query.get();
    const lists = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      };
    }) as any[];

    if (sortBy === "likes") {
      lists.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else {
      lists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return lists;
  } catch (error) {
    console.warn("getLists error:", error);
    return [];
  }
}

export async function getUserLists(username: string, includePrivate = false) {
  try {
    let query = adminDb.collection("lists").where("ownerUsername", "==", username);

    const snap = await query.get();
    let lists = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      };
    }) as any[];

    if (!includePrivate) {
      lists = lists.filter((list) => list.visibility === "public");
    }

    // Sort: pinned first, then newest
    lists.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return lists;
  } catch (error) {
    console.warn("getUserLists error:", error);
    return [];
  }
}

export async function getSavedLists(userId: string) {
  try {
    const savedSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("savedLists")
      .orderBy("savedAt", "desc")
      .get();

    const lists = await Promise.all(
      savedSnap.docs.map(async (doc) => {
        const listId = doc.id;
        const listDoc = await adminDb.collection("lists").doc(listId).get();
        if (!listDoc.exists) return null;
        const data = listDoc.data();
        // Skip private lists unless user is owner or collaborator
        if (data?.visibility === "private" && data?.ownerId !== userId && !data?.collaborators?.some((c: any) => c.uid === userId)) {
          return null;
        }
        return {
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        };
      })
    );

    return lists.filter(Boolean) as any[];
  } catch (error) {
    console.warn("getSavedLists error:", error);
    return [];
  }
}

export async function checkIfUserLikedList(listId: string, userId: string): Promise<boolean> {
  try {
    const doc = await adminDb
      .collection("lists")
      .doc(listId)
      .collection("likes")
      .doc(userId)
      .get();
    return doc.exists;
  } catch (e) {
    return false;
  }
}

export async function checkIfUserSavedList(listId: string, userId: string): Promise<boolean> {
  try {
    const doc = await adminDb
      .collection("users")
      .doc(userId)
      .collection("savedLists")
      .doc(listId)
      .get();
    return doc.exists;
  } catch (e) {
    return false;
  }
}

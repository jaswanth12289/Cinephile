"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { searchMedia, getMovieWatchProviders, getTVWatchProviders } from "@/lib/tmdb/client";
import { FieldValue } from "firebase-admin/firestore";

interface FavoriteItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
}

/**
 * Updates the bio description for the logged-in user.
 */
export async function updateBio(bio: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (bio.length > 160) return { success: false, error: "Bio cannot exceed 160 characters" };

  try {
    const userRef = adminDb.collection("users").doc(session.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    await userRef.update({ bio });

    if (userData?.username) {
      revalidatePath(`/user/${userData.username}`);
    }
    return { success: true };
  } catch (error) {
    console.warn("updateBio error:", error);
    return { success: false, error: "Failed to update bio" };
  }
}

/**
 * Pins a movie/show into the user's top 4 favorites list (index 0 to 3).
 * Set favoriteItem = null to clear the slot.
 */
export async function pinFavorite(index: number, favoriteItem: FavoriteItem | null) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (index < 0 || index > 3) return { success: false, error: "Invalid favorites slot index" };

  try {
    const userRef = adminDb.collection("users").doc(session.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    let favorites = userData?.favorites || [null, null, null, null];

    // Pad to at least 4 items to ensure indices map properly
    while (favorites.length < 4) {
      favorites.push(null);
    }

    favorites[index] = favoriteItem;

    await userRef.update({ favorites });

    if (userData?.username) {
      revalidatePath(`/user/${userData.username}`);
    }
    return { success: true };
  } catch (error) {
    console.warn("pinFavorite error:", error);
    return { success: false, error: "Failed to pin favorite item" };
  }
}

/**
 * Server action to search TMDB titles, avoiding Node.js module imports on client components.
 */
export async function searchTMDBSocial(query: string) {
  try {
    const results = await searchMedia(query);
    return results?.results || [];
  } catch (e) {
    console.warn("searchTMDBSocial error:", e);
    return [];
  }
}

/**
 * Searches users inside Firestore by username or displayName using index prefix ranges.
 */
export async function searchUsers(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();

  try {
    // Prefix search on usernameLower
    const usernameSnap = await adminDb
      .collection("users")
      .where("usernameLower", ">=", q)
      .where("usernameLower", "<=", q + "\uf8ff")
      .limit(15)
      .get();

    // Prefix search on displayNameLower
    const displayNameSnap = await adminDb
      .collection("users")
      .where("displayNameLower", ">=", q)
      .where("displayNameLower", "<=", q + "\uf8ff")
      .limit(15)
      .get();

    // Merge in memory based on document ID (uid) to deduplicate results
    const merged = new Map();
    usernameSnap.docs.forEach((doc) => {
      merged.set(doc.id, doc.data());
    });
    displayNameSnap.docs.forEach((doc) => {
      merged.set(doc.id, doc.data());
    });

    return Array.from(merged.values()).map((user) => ({
      uid: user.uid,
      displayName: user.displayName || "Cinephile User",
      username: user.username || "cinephile",
      photoURL: user.photoURL || null,
      bio: user.bio || null,
      followersCount: user.followersCount || user.followers?.length || 0,
      followingCount: user.followingCount || user.following?.length || 0,
    }));
  } catch (error) {
    console.warn("searchUsers error:", error);
    return [];
  }
}

/**
 * Completes onboarding and sets up user profile data.
 */
export async function setupProfile(data: {
  displayName: string;
  username: string;
  bio: string;
  favoriteMovie?: { tmdbId: number; title: string; posterPath: string | null } | null;
  favoriteGenre?: string;
  photoURL?: string;
  bannerURL?: string;
  accountType?: "viewer" | "reviewer" | "curator" | "creator";
  favoriteGenres?: string[];
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  if (!data.displayName.trim() || !data.username.trim()) {
    return { success: false, error: "Display Name and Username are required" };
  }

  if (!data.bio || !data.bio.trim()) {
    return { success: false, error: "Bio is required" };
  }

  const usernameLower = data.username.trim().toLowerCase();

  // Validate displayName and username format/length
  if (data.displayName.length > 50) {
    return { success: false, error: "Display Name cannot exceed 50 characters." };
  }
  if (data.bio.trim().length > 150) {
    return { success: false, error: "Bio cannot exceed 150 characters." };
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameLower)) {
    return { success: false, error: "Username must be 3-20 characters and contain only letters, numbers, or underscores." };
  }

  const allowedAccountTypes = ["viewer", "reviewer", "curator", "creator"];
  if (data.accountType && !allowedAccountTypes.includes(data.accountType)) {
    return { success: false, error: "Invalid Account Type" };
  }

  if (data.favoriteGenres && data.favoriteGenres.length > 3) {
    return { success: false, error: "You can select up to 3 favorite genres" };
  }

  try {
    // Check if username is already taken by another user
    const existingUsernameSnap = await adminDb
      .collection("users")
      .where("usernameLower", "==", usernameLower)
      .get();

    if (!existingUsernameSnap.empty && existingUsernameSnap.docs[0].id !== session.uid) {
      return { success: false, error: "Username is already taken by another user" };
    }

    const userRef = adminDb.collection("users").doc(session.uid);
    const userDoc = await userRef.get();
    const oldData = userDoc.data();
    const oldUsernameLower = oldData?.usernameLower;

    const batch = adminDb.batch();

    // Handle username changes
    if (oldUsernameLower && oldUsernameLower !== usernameLower) {
      batch.delete(adminDb.collection("usernames").doc(oldUsernameLower));
    }

    batch.set(adminDb.collection("usernames").doc(usernameLower), { uid: session.uid });

    batch.set(
      userRef,
      {
        displayName: data.displayName.trim(),
        displayNameLower: data.displayName.trim().toLowerCase(),
        username: data.username.trim(),
        usernameLower,
        bio: data.bio.trim(),
        favoriteMovie: data.favoriteMovie || null,
        favoriteGenre: data.favoriteGenre || "",
        photoURL: data.photoURL !== undefined ? data.photoURL : (oldData?.photoURL || ""),
        bannerURL: data.bannerURL || oldData?.bannerURL || "",
        profileCompleted: true,
        accountType: data.accountType || "viewer",
        preferences: {
          favoriteGenres: data.favoriteGenres || [],
        },
        followersCount: oldData?.followersCount ?? 0,
        followingCount: oldData?.followingCount ?? 0,
        createdAt: oldData?.createdAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    revalidatePath("/feed");
    revalidatePath(`/u/${data.username.trim()}`);
    return { success: true };
  } catch (error) {
    console.warn("setupProfile error:", error);
    return { success: false, error: "Failed to setup profile. Please try again." };
  }
}

export async function getCurrentUserProfile() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const docSnap = await adminDb.collection("users").doc(session.uid).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data) {
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            data.createdAt = data.createdAt.toDate().toISOString();
          } else if (data.createdAt._seconds) {
            data.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
          } else {
            data.createdAt = new Date(data.createdAt).toISOString();
          }
        }
      }
      return { success: true, exists: true, data };
    } else {
      return { success: true, exists: false };
    }
  } catch (error) {
    console.warn("getCurrentUserProfile error:", error);
    return { success: false, error: "Failed to fetch user profile" };
  }
}

/**
 * Checks in real-time whether a username is available.
 */
export async function checkUsernameUnique(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  if (!usernameLower) return false;
  try {
    const doc = await adminDb.collection("usernames").doc(usernameLower).get();
    return !doc.exists;
  } catch (error) {
    console.warn("checkUsernameUnique error:", error);
    return false;
  }
}

/**
 * Securely fetches watch providers on the server.
 */
export async function fetchWatchProvidersSocial(
  id: number,
  mediaType: "movie" | "tv",
  region: string = "IN"
) {
  try {
    if (mediaType === "tv") {
      return await getTVWatchProviders(id, region);
    } else {
      return await getMovieWatchProviders(id, region);
    }
  } catch (error) {
    console.warn("fetchWatchProvidersSocial error:", error);
    return null;
  }
}

/**
 * Server action to upload avatar file bytes to Firebase Storage to bypass browser CORS policy.
 */
export async function uploadAvatarServer(base64Data: string, mimeType: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const bucket = adminStorage.bucket();
    const buffer = Buffer.from(base64Data, "base64");
    const file = bucket.file(`users/${session.uid}/avatar_${Date.now()}`);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make public so standard alt=media access works without signatures
    await file.makePublic().catch((e) => {
      console.warn("makePublic failed (might be fine if default bucket permissions are open):", e);
    });

    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;

    return { success: true, downloadURL };
  } catch (error: any) {
    console.error("uploadAvatarServer error:", error);
    return { success: false, error: error.message || "Failed to upload avatar" };
  }
}

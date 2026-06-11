"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import type { CollectionReference } from "firebase-admin/firestore";
import { cookies } from "next/headers";

export async function createUserDocument(uid: string, email: string, username: string, displayName: string) {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        uid,
        email,
        username,
        displayName,
        usernameLower: username.toLowerCase(),
        displayNameLower: displayName.toLowerCase(),
        photoURL: "",
        bio: "",
        profileCompleted: false,
        bannerURL: "",
        favoriteMovie: "",
        favoriteGenre: "",
        followersCount: 0,
        followingCount: 0,
        preferences: {
          favoriteGenres: [],
          regionalFocus: [],
        },
        favorites: {
          movies: [],
          tv: [],
        },
        stats: {
          moviesWatched: 0,
          episodesWatched: 0,
          totalHours: 0,
          longestStreak: 0,
        },
        achievements: [],
        role: "user",
        subscription: {
          isPremium: false,
          planType: "free",
        },
        createdAt: new Date(),
      });
    }
    return { success: true };
  } catch (error) {
    console.warn("Error creating user doc", error);
    return { success: false, error: "Failed to create user document" };
  }
}

// ─── Helper: delete every doc in a collection reference ──────────────────────
async function deleteSubCollection(
  colRef: CollectionReference,
  batchSize = 200
) {
  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Permanently deletes the currently logged-in user's account.
 * Cascades through: activities (+ comments/reactions), lists
 * (+ items/comments), watchTracking, notifications, username
 * reservation, the user Firestore doc, and the Firebase Auth record.
 */
export async function deleteAccount() {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const uid = session.uid;

  try {
    // 1. Activities and their sub-collections
    const activitiesSnap = await adminDb
      .collection("activities")
      .where("userId", "==", uid)
      .get();
    for (const actDoc of activitiesSnap.docs) {
      await deleteSubCollection(actDoc.ref.collection("comments"));
      await deleteSubCollection(actDoc.ref.collection("reactions"));
      await actDoc.ref.delete();
    }

    // 2. Lists and their sub-collections
    const listsSnap = await adminDb
      .collection("lists")
      .where("ownerId", "==", uid)
      .get();
    for (const listDoc of listsSnap.docs) {
      await deleteSubCollection(listDoc.ref.collection("items"));
      await deleteSubCollection(listDoc.ref.collection("comments"));
      await listDoc.ref.delete();
    }

    // 3. watchTracking records
    const trackingSnap = await adminDb
      .collection("watchTracking")
      .where("userId", "==", uid)
      .get();
    if (!trackingSnap.empty) {
      const batch = adminDb.batch();
      trackingSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // 4. Notifications (as recipient or sender)
    for (const field of ["recipientId", "senderId"]) {
      const snap = await adminDb
        .collection("notifications")
        .where(field, "==", uid)
        .get();
      if (!snap.empty) {
        const batch = adminDb.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 5. Username reservation
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const username = userDoc.data()?.usernameLower;
    if (username) {
      await adminDb.collection("usernames").doc(username).delete();
    }

    // 6. User Firestore document
    await adminDb.collection("users").doc(uid).delete();

    // 7. Firebase Auth record (must be last)
    await adminAuth.deleteUser(uid);

    return { success: true };
  } catch (error: any) {
    console.error("deleteAccount error:", error);
    return { success: false, error: error.message || "Failed to delete account" };
  }
}

export async function verifySession() {
  const sessionCookie = (await cookies()).get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

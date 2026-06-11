"use server";

import { adminDb } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

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

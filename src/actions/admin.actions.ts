"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

export async function createClubAction(title: string, description: string, tags: string[]) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const clubRef = adminDb.collection("clubs").doc();
    await clubRef.set({
      id: clubRef.id,
      title,
      description,
      tags,
      membersCount: 0,
      createdAt: FieldValue.serverTimestamp()
    });

    revalidatePath("/clubs");
    return { success: true, clubId: clubRef.id };
  } catch (error) {
    console.error("createClub error:", error);
    return { success: false, error: "Failed to create club" };
  }
}

export async function joinClubAction(clubId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const clubRef = adminDb.collection("clubs").doc(clubId);
    const memberRef = clubRef.collection("members").doc(session.uid);

    await adminDb.runTransaction(async (transaction) => {
      const clubDoc = await transaction.get(clubRef);
      if (!clubDoc.exists) throw new Error("Club not found");
      
      const memberDoc = await transaction.get(memberRef);
      if (memberDoc.exists) throw new Error("Already a member");

      transaction.set(memberRef, {
        userId: session.uid,
        joinedAt: FieldValue.serverTimestamp()
      });
      transaction.update(clubRef, {
        membersCount: FieldValue.increment(1)
      });
    });

    revalidatePath(`/club/${clubId}`);
    return { success: true };
  } catch (error: any) {
    console.error("joinClub error:", error);
    return { success: false, error: error.message || "Failed to join club" };
  }
}

export async function leaveClubAction(clubId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const clubRef = adminDb.collection("clubs").doc(clubId);
    const memberRef = clubRef.collection("members").doc(session.uid);

    await adminDb.runTransaction(async (transaction) => {
      const clubDoc = await transaction.get(clubRef);
      if (!clubDoc.exists) throw new Error("Club not found");
      
      const memberDoc = await transaction.get(memberRef);
      if (!memberDoc.exists) throw new Error("Not a member");

      transaction.delete(memberRef);
      transaction.update(clubRef, {
        membersCount: FieldValue.increment(-1)
      });
    });

    revalidatePath(`/club/${clubId}`);
    return { success: true };
  } catch (error: any) {
    console.error("leaveClub error:", error);
    return { success: false, error: error.message || "Failed to leave club" };
  }
}

export async function createChallengeAction(title: string, description: string, rewardBadge: string, endsAtDateStr: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "Not authenticated" };

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const challengeRef = adminDb.collection("challenges").doc();
    await challengeRef.set({
      id: challengeRef.id,
      title,
      description,
      rewardBadge,
      endsAt: new Date(endsAtDateStr),
      createdAt: FieldValue.serverTimestamp()
    });

    revalidatePath("/challenges");
    return { success: true };
  } catch (error) {
    console.error("createChallenge error:", error);
    return { success: false, error: "Failed to create challenge" };
  }
}

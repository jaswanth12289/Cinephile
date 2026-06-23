"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Verifies the current user session via Supabase Auth.
 * Returns the Supabase User object or null.
 * Drop-in replacement for the old verifySession().
 */
export async function verifySession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Creates a profile row in Supabase for a new user.
 * Called after sign-up or first Google login.
 * Replaces the old Firestore createUserDocument().
 */
export async function createUserDocument(
  uid: string,
  email: string,
  username: string,
  displayName: string
) {
  try {
    const supabase = createServiceClient();
    const usernameLower = username.toLowerCase().replace(/[^a-z0-9_]/g, "");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: uid,
        username: usernameLower || uid.slice(0, 8),
        username_lower: usernameLower || uid.slice(0, 8),
        display_name: displayName || "Cinephile User",
        display_name_lower: (displayName || "Cinephile User").toLowerCase(),
        profile_completed: false,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (error) {
      console.warn("createUserDocument error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.warn("createUserDocument error:", error);
    return { success: false, error: "Failed to create user document" };
  }
}

/**
 * Permanently deletes the currently logged-in user's account.
 * Cascades are handled by PostgreSQL ON DELETE CASCADE on all foreign keys.
 */
export async function deleteAccount() {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const serviceClient = createServiceClient();

    // Delete auth user — Supabase cascade handles all profile/activity data
    const { error } = await serviceClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("deleteAccount error:", error.message);
      return { success: false, error: error.message };
    }

    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");

    return { success: true };
  } catch (error: any) {
    console.error("deleteAccount error:", error);
    return { success: false, error: error.message || "Failed to delete account" };
  }
}

/**
 * Checks if a username is available (case-insensitive).
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  if (!usernameLower) return false;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username_lower", usernameLower)
      .maybeSingle();
    return data === null;
  } catch {
    return false;
  }
}

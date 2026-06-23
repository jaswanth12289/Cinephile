// @ts-nocheck
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { searchMedia, getMovieWatchProviders, getTVWatchProviders } from "@/lib/tmdb/client";

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
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (bio.length > 160) return { success: false, error: "Bio cannot exceed 160 characters" };

  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ bio, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("username")
      .single();

    if (error) throw error;
    if (profile?.username) revalidatePath(`/u/${profile.username}`);
    return { success: true };
  } catch (error: any) {
    console.warn("updateBio error:", error);
    return { success: false, error: "Failed to update bio" };
  }
}

/**
 * Pins a movie/show into the user's top 4 favorites (sort_order 0–3).
 * Set favoriteItem = null to clear the slot.
 */
export async function pinFavorite(index: number, favoriteItem: FavoriteItem | null) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (index < 0 || index > 3) return { success: false, error: "Invalid favorites slot index" };

  try {
    const supabase = await createClient();

    if (favoriteItem === null) {
      await supabase
        .from("favorite_movies")
        .delete()
        .eq("user_id", user.id)
        .eq("sort_order", index);
    } else {
      await supabase.from("favorite_movies").upsert(
        {
          user_id: user.id,
          tmdb_id: favoriteItem.tmdbId,
          media_type: favoriteItem.mediaType,
          title: favoriteItem.title,
          poster_path: favoriteItem.posterPath,
          backdrop_path: favoriteItem.backdropPath,
          year: favoriteItem.year,
          sort_order: index,
        },
        { onConflict: "user_id,sort_order" }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (profile?.username) revalidatePath(`/u/${profile.username}`);
    return { success: true };
  } catch (error: any) {
    console.warn("pinFavorite error:", error);
    return { success: false, error: "Failed to pin favorite item" };
  }
}

/**
 * Server action to search TMDB titles.
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
 * Searches users by username or display name prefix.
 */
export async function searchUsers(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, followers_count, following_count")
      .or(`username_lower.ilike.${q}%,display_name_lower.ilike.${q}%`)
      .limit(15);

    if (error) throw error;

    return (data || []).map((u) => ({
      uid: u.id,
      displayName: u.display_name || "Cinephile User",
      username: u.username || "cinephile",
      photoURL: u.avatar_url || null,
      bio: u.bio || null,
      followersCount: u.followers_count || 0,
      followingCount: u.following_count || 0,
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
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  if (!data.displayName.trim() || !data.username.trim()) {
    return { success: false, error: "Display Name and Username are required" };
  }
  if (!data.bio || !data.bio.trim()) {
    return { success: false, error: "Bio is required" };
  }

  const usernameLower = data.username.trim().toLowerCase();

  if (data.displayName.length > 50) return { success: false, error: "Display Name cannot exceed 50 characters." };
  if (data.bio.trim().length > 150) return { success: false, error: "Bio cannot exceed 150 characters." };
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameLower)) {
    return { success: false, error: "Username must be 3-20 characters (letters, numbers, underscores)." };
  }

  const allowedAccountTypes = ["viewer", "reviewer", "curator", "creator"];
  if (data.accountType && !allowedAccountTypes.includes(data.accountType)) {
    return { success: false, error: "Invalid Account Type" };
  }
  if (data.favoriteGenres && data.favoriteGenres.length > 3) {
    return { success: false, error: "You can select up to 3 favorite genres" };
  }

  try {
    const supabase = createServiceClient();

    // Check username uniqueness (excluding current user)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username_lower", usernameLower)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) return { success: false, error: "Username is already taken by another user" };

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: data.username.trim(),
      username_lower: usernameLower,
      display_name: data.displayName.trim(),
      display_name_lower: data.displayName.trim().toLowerCase(),
      bio: data.bio.trim(),
      favorite_genre: data.favoriteGenre || null,
      avatar_url: data.photoURL !== undefined ? data.photoURL : undefined,
      banner_url: data.bannerURL || undefined,
      profile_completed: true,
      account_type: data.accountType || "viewer",
      preferences: { favoriteGenres: data.favoriteGenres || [] },
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) throw error;

    // Handle favoriteMovie pin at slot 0
    if (data.favoriteMovie) {
      await supabase.from("favorite_movies").upsert({
        user_id: user.id,
        tmdb_id: data.favoriteMovie.tmdbId,
        media_type: "movie",
        title: data.favoriteMovie.title,
        poster_path: data.favoriteMovie.posterPath,
        sort_order: 0,
      }, { onConflict: "user_id,sort_order" });
    }

    revalidatePath("/feed");
    revalidatePath(`/u/${data.username.trim()}`);
    return { success: true };
  } catch (error: any) {
    console.error("setupProfile error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { success: false, error: "Failed to setup profile. Please try again." };
  }
}

export async function getCurrentUserProfile() {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*, favorite_movies(*)")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) return { success: true, exists: true, data };
    return { success: true, exists: false };
  } catch (error) {
    console.warn("getCurrentUserProfile error:", error);
    return { success: false, error: "Failed to fetch user profile" };
  }
}

/**
 * Checks if a username is available.
 */
export async function checkUsernameUnique(username: string): Promise<boolean> {
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

/**
 * Securely fetches watch providers on the server.
 */
export async function fetchWatchProvidersSocial(id: number, mediaType: "movie" | "tv", region = "IN") {
  try {
    return mediaType === "tv"
      ? await getTVWatchProviders(id, region)
      : await getMovieWatchProviders(id, region);
  } catch {
    return null;
  }
}

/**
 * Uploads avatar to Supabase Storage.
 */
export async function uploadAvatarServer(base64Data: string, mimeType: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return { success: false, error: "Avatar image exceeds 2MB limit" };
    }

    const supabase = await createClient();
    const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
    const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Update profile avatar_url
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    return { success: true, downloadURL: publicUrl };
  } catch (error: any) {
    console.error("uploadAvatarServer error:", error);
    return { success: false, error: error.message || "Failed to upload avatar" };
  }
}

/**
 * Updates the user's activity streak (48-hour rolling window).
 */
export async function updateUserStreak(userId: string) {
  try {
    const supabase = createServiceClient();
    const { data: stats } = await supabase
      .from("user_stats")
      .select("current_streak, longest_streak, last_activity_at, last_streak_increment_at")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    const lastActivity = stats?.last_activity_at ? new Date(stats.last_activity_at) : new Date(0);
    const lastIncrement = stats?.last_streak_increment_at ? new Date(stats.last_streak_increment_at) : new Date(0);

    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    const hoursSinceLastIncrement = (now.getTime() - lastIncrement.getTime()) / (1000 * 60 * 60);

    let currentStreak = stats?.current_streak || 0;
    let longestStreak = stats?.longest_streak || 0;
    let shouldUpdateIncrement = false;

    if (hoursSinceLastActivity > 48) {
      currentStreak = 1;
      shouldUpdateIncrement = true;
    } else if (hoursSinceLastIncrement > 24) {
      currentStreak += 1;
      shouldUpdateIncrement = true;
    } else if (currentStreak === 0) {
      currentStreak = 1;
      shouldUpdateIncrement = true;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    const updateData: any = {
      last_activity_at: now.toISOString(),
      current_streak: currentStreak,
      longest_streak: longestStreak,
      updated_at: now.toISOString(),
    };

    if (shouldUpdateIncrement) {
      updateData.last_streak_increment_at = now.toISOString();
    }

    await supabase
      .from("user_stats")
      .upsert({ user_id: userId, ...updateData }, { onConflict: "user_id" });

    // Evaluate badges lazily
    const { evaluateBadges } = await import("@/lib/badges/badgeEngine");
    await evaluateBadges(userId);
  } catch (error) {
    console.warn("updateUserStreak error:", error);
  }
}

/**
 * Toggles following a hashtag.
 */
export async function toggleFollowTag(tag: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const cleanTag = tag.replace(/^#/, "").toLowerCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("following_tags")
      .eq("id", user.id)
      .single();

    const currentTags: string[] = profile?.following_tags || [];
    const newTags = currentTags.includes(cleanTag)
      ? currentTags.filter((t) => t !== cleanTag)
      : [...currentTags, cleanTag];

    await supabase
      .from("profiles")
      .update({ following_tags: newTags, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    revalidatePath(`/tag/${cleanTag}`);
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("toggleFollowTag error:", error);
    return { success: false, error: "Failed to toggle tag" };
  }
}

/**
 * Blocks a user.
 */
export async function blockUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (user.id === targetUserId) return { success: false, error: "Cannot block yourself" };

  try {
    const supabase = await createClient();
    await supabase.from("blocked_users").upsert(
      { user_id: user.id, blocked_user_id: targetUserId },
      { onConflict: "user_id,blocked_user_id" }
    );
    const { unfollowUser } = await import("@/actions/social.actions");
    await unfollowUser(targetUserId).catch(() => {});
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("blockUser error:", error);
    return { success: false, error: "Failed to block user" };
  }
}

/**
 * Unblocks a user.
 */
export async function unblockUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    await supabase.from("blocked_users").delete().eq("user_id", user.id).eq("blocked_user_id", targetUserId);
    return { success: true };
  } catch (error) {
    console.warn("unblockUser error:", error);
    return { success: false, error: "Failed to unblock user" };
  }
}

/**
 * Mutes a user.
 */
export async function muteUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (user.id === targetUserId) return { success: false, error: "Cannot mute yourself" };

  try {
    const supabase = await createClient();
    await supabase.from("muted_users").upsert(
      { user_id: user.id, muted_user_id: targetUserId },
      { onConflict: "user_id,muted_user_id" }
    );
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.warn("muteUser error:", error);
    return { success: false, error: "Failed to mute user" };
  }
}

/**
 * Unmutes a user.
 */
export async function unmuteUser(targetUserId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    await supabase.from("muted_users").delete().eq("user_id", user.id).eq("muted_user_id", targetUserId);
    return { success: true };
  } catch (error) {
    console.warn("unmuteUser error:", error);
    return { success: false, error: "Failed to unmute user" };
  }
}

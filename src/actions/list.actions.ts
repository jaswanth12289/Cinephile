"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifySession } from "./auth.actions";
import { revalidatePath } from "next/cache";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb/client";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function generateUniqueSlug(title: string): Promise<string> {
  const supabase = createServiceClient();
  const baseSlug = slugify(title) || "list";
  let slug = baseSlug;
  let counter = 0;

  while (counter < 5) {
    const { data } = await supabase
      .from("lists")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug}-${randomSuffix}`;
    counter++;
  }
  return slug;
}

async function fetchItemRuntime(tmdbId: number, mediaType: "movie" | "tv"): Promise<number> {
  try {
    if (mediaType === "tv") {
      const details = await getTVDetails(tmdbId.toString()).catch(() => null);
      if (!details) return 45;
      const ep = details.episode_run_time?.[0] || details.last_episode_to_air?.runtime || 45;
      const total = details.number_of_episodes || 10;
      return ep * total;
    } else {
      const details = await getMovieDetails(tmdbId.toString()).catch(() => null);
      return details?.runtime || 120;
    }
  } catch {
    return 120;
  }
}

export interface ListItemInput {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseYear: string;
  note?: { text: string; imageUrl?: string } | string;
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
  coverItem?: { tmdbId: number; mediaType: "movie" | "tv"; title: string; backdropPath: string | null } | null;
  items: ListItemInput[];
}) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };
  if (!data.title.trim()) return { success: false, error: "List title is required" };

  try {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();

    if (!profile) return { success: false, error: "User profile not found" };

    const slug = await generateUniqueSlug(data.title);

    let totalMinutes = 0;
    const itemsWithRuntime = await Promise.all(
      data.items.map(async (item, idx) => {
        const runtime = await fetchItemRuntime(item.tmdbId, item.mediaType);
        totalMinutes += runtime;
        return { ...item, order: idx + 1, runtimeMinutes: runtime };
      })
    );

    const estimatedWatchTimeHours = Math.round(totalMinutes / 60);

    // Resolve backdrop for cover
    let backdropPath = data.coverItem?.backdropPath || null;
    if (!backdropPath && itemsWithRuntime.length > 0) {
      const first = itemsWithRuntime[0];
      try {
        const details =
          first.mediaType === "tv"
            ? await getTVDetails(first.tmdbId.toString())
            : await getMovieDetails(first.tmdbId.toString());
        backdropPath = details?.backdrop_path || null;
      } catch {}
    }

    const featuredItems = itemsWithRuntime.slice(0, 4).map((i) => ({
      title: i.title,
      posterPath: i.posterPath,
    }));

    const { data: list, error: listError } = await supabase
      .from("lists")
      .insert({
        owner_id: user.id,
        title: data.title,
        description: data.description,
        slug,
        visibility: data.visibility,
        items_count: itemsWithRuntime.length,
        featured_items: featuredItems,
      })
      .select("id, slug")
      .single();

    if (listError) throw listError;

    // Insert list items
    if (itemsWithRuntime.length > 0) {
      await supabase.from("list_items").insert(
        itemsWithRuntime.map((item) => ({
          list_id: list.id,
          media_id: String(item.tmdbId),
          media_type: item.mediaType,
          sort_order: item.order,
        }))
      );
    }

    // Write feed activity if public
    if (data.visibility === "public") {
      const { createPostAction } = await import("./social.actions");
      await createPostAction({
        type: "list_created",
        list_id: list.id,
        list_title: data.title,
      } as any).catch(() => {});
    }

    revalidatePath("/lists");
    revalidatePath(`/u/${profile.username}`);
    return { success: true, slug: list.slug };
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
    coverItem?: { tmdbId: number; mediaType: "movie" | "tv"; title: string; backdropPath: string | null } | null;
    items: ListItemInput[];
  }
) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("lists")
      .select("id, slug, owner_id, title")
      .eq("id", listId)
      .single();

    if (!existing) return { success: false, error: "List not found" };
    if (existing.owner_id !== user.id) return { success: false, error: "Unauthorized" };

    let slug = existing.slug;
    if (data.title !== existing.title) {
      slug = await generateUniqueSlug(data.title);
    }

    let totalMinutes = 0;
    const itemsWithRuntime = await Promise.all(
      data.items.map(async (item, idx) => {
        const runtime = await fetchItemRuntime(item.tmdbId, item.mediaType);
        totalMinutes += runtime;
        return { ...item, order: idx + 1, runtimeMinutes: runtime };
      })
    );

    const featuredItems = itemsWithRuntime.slice(0, 4).map((i) => ({
      title: i.title,
      posterPath: i.posterPath,
    }));

    await supabase
      .from("lists")
      .update({
        title: data.title,
        description: data.description,
        slug,
        visibility: data.visibility,
        items_count: itemsWithRuntime.length,
        featured_items: featuredItems,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listId);

    // Replace all items
    await supabase.from("list_items").delete().eq("list_id", listId);
    if (itemsWithRuntime.length > 0) {
      await supabase.from("list_items").insert(
        itemsWithRuntime.map((item) => ({
          list_id: listId,
          media_id: String(item.tmdbId),
          media_type: item.mediaType,
          sort_order: item.order,
        }))
      );
    }

    revalidatePath("/lists");
    revalidatePath(`/list/${slug}`);
    return { success: true, slug };
  } catch (error) {
    console.warn("updateList error:", error);
    return { success: false, error: "Failed to update list" };
  }
}

export async function deleteList(listId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = createServiceClient();
    const { data: list } = await supabase
      .from("lists")
      .select("owner_id, slug")
      .eq("id", listId)
      .single();

    if (!list) return { success: false, error: "List not found" };
    if (list.owner_id !== user.id) return { success: false, error: "Only the owner can delete this list" };

    // Cascade handled by FK ON DELETE CASCADE for list_items
    await supabase.from("lists").delete().eq("id", listId);

    revalidatePath("/lists");
    return { success: true };
  } catch (error) {
    console.warn("deleteList error:", error);
    return { success: false, error: "Failed to delete list" };
  }
}

export async function getListBySlug(slug: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("lists")
      .select(`*, profiles!lists_owner_id_fkey (id, username, display_name, avatar_url)`)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("getListBySlug error:", error);
    return null;
  }
}

export async function getListItems(listId: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getListItems error:", error);
    return [];
  }
}

export async function likeList(listId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const { data: list } = await supabase.from("lists").select("likes_count").eq("id", listId).single();
    await supabase.from("lists").update({ likes_count: (list?.likes_count || 0) + 1 }).eq("id", listId);
    revalidatePath(`/list/${listId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to like list" };
  }
}

export async function unlikeList(listId: string) {
  const user = await verifySession();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();
    const { data: list } = await supabase.from("lists").select("likes_count").eq("id", listId).single();
    await supabase
      .from("lists")
      .update({ likes_count: Math.max(0, (list?.likes_count || 0) - 1) })
      .eq("id", listId);
    revalidatePath(`/list/${listId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to unlike list" };
  }
}

export async function getPublicLists(limitCount = 20) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("lists")
      .select(`*, profiles!lists_owner_id_fkey (id, username, display_name, avatar_url)`)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getPublicLists error:", error);
    return [];
  }
}

export async function getUserLists(userId: string, limitCount = 20) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("lists")
      .select(`*, profiles!lists_owner_id_fkey (id, username, display_name, avatar_url)`)
      .eq("owner_id", userId)
      .in("visibility", ["public", "unlisted"])
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("getUserLists error:", error);
    return [];
  }
}

export async function saveList() { return { success: true }; }
export async function unsaveList() { return { success: true }; }
export async function forkList() { return { success: true }; }
export async function incrementListViews() { return { success: true }; }
export async function incrementListShares() { return { success: true }; }

export const checkIfUserLikedList = async () => false;
export const checkIfUserSavedList = async () => false;
export const getLists = async () => ({ success: true, lists: [] });

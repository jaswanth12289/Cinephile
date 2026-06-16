import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "cinephile-cache";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("movieDetails")) {
          db.createObjectStore("movieDetails", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("tvDetails")) {
          db.createObjectStore("tvDetails", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("recentlyViewed")) {
          db.createObjectStore("recentlyViewed", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export interface RecentlyViewedItem {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  timestamp: number;
}

export async function cacheMovieDetails(id: string, data: any) {
  const db = await getDB();
  if (!db) return;
  await db.put("movieDetails", { id, data, cachedAt: Date.now() });
}

export async function getCachedMovieDetails(id: string) {
  const db = await getDB();
  if (!db) return null;
  const entry = await db.get("movieDetails", id);
  return entry ? entry.data : null;
}

export async function cacheTVDetails(id: string, data: any) {
  const db = await getDB();
  if (!db) return;
  await db.put("tvDetails", { id, data, cachedAt: Date.now() });
}

export async function getCachedTVDetails(id: string) {
  const db = await getDB();
  if (!db) return null;
  const entry = await db.get("tvDetails", id);
  return entry ? entry.data : null;
}

export async function addRecentlyViewed(item: {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}) {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction("recentlyViewed", "readwrite");
  const store = tx.objectStore("recentlyViewed");
  
  await store.put({
    ...item,
    timestamp: Date.now(),
  });

  // Fetch all to enforce limit of 20
  const all = await store.getAll();
  all.sort((a, b) => b.timestamp - a.timestamp);

  if (all.length > 20) {
    const itemsToDelete = all.slice(20);
    for (const deleteItem of itemsToDelete) {
      await store.delete(deleteItem.id);
    }
  }

  await tx.done;
}

export async function getRecentlyViewed(): Promise<RecentlyViewedItem[]> {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAll("recentlyViewed");
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all;
}

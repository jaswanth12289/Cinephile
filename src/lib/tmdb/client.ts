import dns from "dns";

// Prefer IPv4 to avoid IPv6 routing failures to TMDB
dns.setDefaultResultOrder("ipv4first");

// Application-level DNS bypass to work around ISP DNS hijacking of TMDB
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("[TMDB DNS Override] Failed to initialize public DNS resolvers:", e);
}

const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (hostname, options, callback) => {
  let cb = callback;
  let opts: any = options;
  
  if (typeof options === "function") {
    cb = options;
    opts = {};
  } else if (typeof options === "number") {
    opts = { family: options };
  }

  if (hostname === "api.themoviedb.org") {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        const callbackFn = cb as any;
        if (opts && opts.all) {
          const results = addresses.map((addr) => ({ address: addr, family: 4 }));
          callbackFn(null, results);
        } else {
          callbackFn(null, addresses[0], 4);
        }
      } else {
        console.warn(`[TMDB DNS Override] dns.resolve4 failed or empty, falling back to originalLookup:`, err);
        originalLookup(hostname, opts, cb as any);
      }
    });
  } else {
    originalLookup(hostname, opts, callback as any);
  }
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Core fetch — uses v4 Bearer access token auth header.
 * Includes AbortController timeout to prevent hanging.
 */
const fetchTMDB = async (
  endpoint: string,
  params: Record<string, string> = {},
  timeoutMs = 12000,
  revalidate = 3600
): Promise<any> => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );

  const token = process.env.TMDB_ACCESS_TOKEN;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  try {
    const response = await fetch(url.toString(), {
      next: { revalidate },
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TMDB ${response.status}: ${response.statusText} — ${endpoint}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`[TMDB] Fetch failed/aborted for endpoint: ${endpoint} in ${Date.now() - startTime}ms:`, error);
    throw error;
  }
};

/** Safe version — never throws; returns null on failure so components can show retry states */
const safeFetchTMDB = async (
  endpoint: string,
  params: Record<string, string> = {},
  revalidate = 3600
): Promise<any> => {
  try {
    return await fetchTMDB(endpoint, params, 12000, revalidate);
  } catch (error) {
    console.warn(`[TMDB] fetch failed for ${endpoint}:`, error);
    return null;
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const getTrending = (
  mediaType: "movie" | "tv" = "movie",
  timeWindow: "day" | "week" = "day"
) => safeFetchTMDB(`/trending/${mediaType}/${timeWindow}`);

export const getTopRated = (mediaType: "movie" | "tv" = "movie") =>
  safeFetchTMDB(`/${mediaType}/top_rated`, {}, 43200);

export const getMovieDetails = (id: string) =>
  fetchTMDB(`/movie/${id}`, {
    append_to_response: "credits,videos,recommendations,release_dates",
  }, 12000, 86400);

export const getTVDetails = (id: string) =>
  fetchTMDB(`/tv/${id}`, {
    append_to_response: "credits,videos,recommendations",
  }, 12000, 86400);

export const searchMedia = (query: string) =>
  safeFetchTMDB("/search/multi", { query });

/** Indian cinema by language code: te · ta · ml · hi */
export const getIndianCinemaTrending = (languageCode: string) =>
  safeFetchTMDB("/discover/movie", {
    with_original_language: languageCode,
    sort_by: "popularity.desc",
  }, 21600);

export const getDiscoverMovies = (params: Record<string, string> = {}) =>
  safeFetchTMDB("/discover/movie", params);

export const getAnimeSpotlight = () =>
  safeFetchTMDB("/discover/tv", {
    with_genres: "16",
    with_original_language: "ja",
    sort_by: "popularity.desc",
  }, 21600);

export const getHiddenGems = () =>
  safeFetchTMDB("/discover/movie", {
    "vote_average.gte": "7.5",
    "vote_count.gte": "100",
    "vote_count.lte": "1500",
    "sort_by": "popularity.desc",
  }, 21600);

export async function getMovieWatchProviders(id: number, region: string = 'IN') {
  try {
    const data = await fetchTMDB(`/movie/${id}/watch/providers`, {}, 12000, 86400);
    return data?.results?.[region] ?? null;
  } catch (e) {
    console.warn("getMovieWatchProviders error:", e);
    return null;
  }
}

export async function getTVWatchProviders(id: number, region: string = 'IN') {
  try {
    const data = await fetchTMDB(`/tv/${id}/watch/providers`, {}, 12000, 86400);
    return data?.results?.[region] ?? null;
  } catch (e) {
    console.warn("getTVWatchProviders error:", e);
    return null;
  }
}

export const getMovieRecommendations = (id: string | number, revalidate = 21600) =>
  safeFetchTMDB(`/movie/${id}/recommendations`, {}, revalidate);

export const getSimilarMovies = (id: string | number, revalidate = 21600) =>
  safeFetchTMDB(`/movie/${id}/similar`, {}, revalidate);


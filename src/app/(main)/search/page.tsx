// @ts-nocheck
import { 
  searchMovies, 
  searchTV, 
  searchPeople, 
  searchCollections, 
  getTrending,
  discoverMedia
} from "@/lib/tmdb/client";
import { searchUsers } from "@/actions/user.actions";
import { MediaCard } from "@/components/shared/MediaCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { SearchTabs } from "@/components/shared/SearchTabs";
import { RecentAndTrendingSearches } from "@/components/shared/RecentAndTrendingSearches";
import { Film, Tv, Users, MessageSquare, Hash } from "lucide-react";
import Link from "next/link";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { PageLoadMeasure } from "@/components/shared/PageLoadMeasure";
import { createServiceClient } from "@/lib/supabase/server";
import { AdvancedSearchFilters } from "@/components/shared/AdvancedSearchFilters";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; t?: string; year?: string; genre?: string; rating?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const activeTab = params.t || "movies";
  const { year, genre, rating } = params;

  let movieResults: any[] = [];
  let tvResults: any[] = [];
  let personResults: any[] = [];
  let userResults: any[] = [];
  let postResults: any[] = [];
  let hashtagResults: any[] = [];

  let searchPromise: Promise<any> = Promise.resolve(null);
  
  const isDiscover = year || genre || rating;

  if (query || isDiscover) {
    if (activeTab === "movies") {
      if (isDiscover) {
        searchPromise = discoverMedia("movie", {
          with_genres: genre,
          primary_release_year: year,
          "vote_average.gte": rating,
        });
      } else {
        searchPromise = searchMovies(query);
      }
    } else if (activeTab === "tv") {
      if (isDiscover) {
        searchPromise = discoverMedia("tv", {
          with_genres: genre,
          primary_release_year: year, // tv discover uses first_air_date_year usually, but TMDB handles it sometimes
          "vote_average.gte": rating,
        });
      } else {
        searchPromise = searchTV(query);
      }
    } else if (activeTab === "people") {
      searchPromise = searchPeople(query);
    } else if (activeTab === "users") {
      searchPromise = searchUsers(query);
    } else if (activeTab === "posts") {
      const supabase = createServiceClient();
      searchPromise = supabase
        .from("activities")
        .select("*")
        .eq("type", "post")
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data }) => {
          const lowerQuery = query.toLowerCase();
          return (data || [])
            .filter((d: any) => (d.post_text || "").toLowerCase().includes(lowerQuery));
        });
    } else if (activeTab === "hashtags") {
      const supabase = createServiceClient();
      searchPromise = supabase
        .from("activities")
        .select("hashtags")
        .eq("type", "post")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          const lowerQuery = query.toLowerCase().replace("#", "");
          const foundTags = new Set<string>();
          (data || []).forEach(d => {
            const tags = d.hashtags || [];
            tags.forEach((t: string) => {
              if (t.toLowerCase().includes(lowerQuery)) {
                foundTags.add(t.toLowerCase());
              }
            });
          });
          return Array.from(foundTags).map(t => ({ tag: t }));
        });
    }
  }

  const [searchResults, trendingMovies, trendingTV] = await Promise.all([
    searchPromise,
    getTrending("movie", "day"),
    getTrending("tv", "day"),
  ]);

  if (query || isDiscover) {
    if (activeTab === "movies") {
      movieResults = searchResults?.results || [];
    } else if (activeTab === "tv") {
      tvResults = searchResults?.results || [];
    } else if (activeTab === "people") {
      personResults = searchResults?.results || [];
    } else if (activeTab === "users") {
      userResults = searchResults || [];
    } else if (activeTab === "posts") {
      postResults = searchResults || [];
    } else if (activeTab === "hashtags") {
      hashtagResults = searchResults || [];
    }
  }

  const movies = trendingMovies?.results?.slice(0, 16) || [];
  const tvShows = trendingTV?.results?.slice(0, 16) || [];

  // Determine result count for the active tab
  let resultsCount = 0;
  if (activeTab === "movies") resultsCount = movieResults.length;
  else if (activeTab === "tv") resultsCount = tvResults.length;
  else if (activeTab === "people") resultsCount = personResults.length;
  else if (activeTab === "users") resultsCount = userResults.length;
  else if (activeTab === "posts") resultsCount = postResults.length;
  else if (activeTab === "hashtags") resultsCount = hashtagResults.length;

  return (
    <div className="min-h-screen bg-[#0F0F1A] py-8 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 space-y-8">
        
        {/* Page Header */}
        <div className="space-y-3 select-none">
          <h1 className="text-[32px] md:text-[40px] font-black tracking-tight text-white leading-none uppercase">
            Search
          </h1>
          <p className="text-[14px] text-muted-foreground max-w-xl leading-relaxed">
            Discover films, series, or connect with other movie lovers across the Cinephile community.
          </p>
        </div>

        {/* Search Bar Input & Filters */}
        <div className="flex gap-3 max-w-3xl relative group mt-2 mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-indigo-500/30 to-amber-500/30 rounded-3xl blur-xl opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
          <div className="relative flex-1 bg-[#11111A]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl flex items-center">
            <SearchInput defaultValue={query} activeTab={activeTab} />
          </div>
          {(activeTab === "movies" || activeTab === "tv") && (
            <div className="relative flex items-center z-10">
              <AdvancedSearchFilters />
            </div>
          )}
        </div>

        {/* Results Stream */}
        {query || params.year || params.genre || params.rating ? (
          <div className="space-y-6">
            
            {/* Tabs Navigation (lazy load inactive tabs, trigger haptics inside SearchTabs client component) */}
            <SearchTabs
              activeTab={activeTab}
              query={query}
              movieCount={activeTab === "movies" ? movieResults.length : null}
              tvCount={activeTab === "tv" ? tvResults.length : null}
              personCount={activeTab === "people" ? personResults.length : null}
              userCount={activeTab === "users" ? userResults.length : null}
              postCount={activeTab === "posts" ? postResults.length : null}
              hashtagCount={activeTab === "hashtags" ? hashtagResults.length : null}
            />

            {/* Results Header */}
            <div className="flex items-center justify-between text-[13px] text-muted-foreground font-semibold select-none">
              <span>Showing results for "{query}"</span>
              <span>{resultsCount} items found</span>
            </div>

            {/* Movies Tab Results */}
            {activeTab === "movies" && (
              movieResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {movieResults.map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.title || item.name}
                      posterPath={item.poster_path}
                      mediaType="movie"
                      rating={item.vote_average}
                      releaseDate={item.release_date || item.first_air_date}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Film />}
                  title="No movies found"
                  description={`We couldn't find any movies matching "${query}". Check your spelling or try another search.`}
                />
              )
            )}

            {/* TV Shows Tab Results */}
            {activeTab === "tv" && (
              tvResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {tvResults.map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.name || item.title}
                      posterPath={item.poster_path}
                      mediaType="tv"
                      rating={item.vote_average}
                      releaseDate={item.first_air_date || item.release_date}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Tv />}
                  title="No series found"
                  description={`We couldn't find any TV shows matching "${query}". Check your spelling or try another search.`}
                />
              )
            )}

            {/* People Tab Results */}
            {activeTab === "people" && (
              personResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {personResults.map((person: any) => (
                    <div 
                      key={person.id} 
                      className="bg-card/25 border border-border/30 rounded-2xl p-4 flex flex-col items-center text-center hover:bg-card/35 transition-all shadow-sm select-none"
                    >
                      <div className="relative h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-white/5 mb-3 shrink-0">
                        {person.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg font-black bg-white/5 uppercase font-display">
                            {person.name[0]}
                          </div>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-1 w-full font-display">
                        {person.name}
                      </h4>
                      <p className="text-[10px] text-[#A1A1AA] line-clamp-1 w-full font-medium mt-1 font-display uppercase tracking-wider">
                        {person.known_for_department || "Cast/Crew"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Users />}
                  title="No people found"
                  description={`We couldn't find any cast or crew members matching "${query}".`}
                />
              )
            )}

            {/* Users Tab Results */}
            {activeTab === "users" && (
              userResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userResults.map((user) => (
                    <div 
                      key={user.id}
                      className="bg-card/25 border border-border/30 rounded-2xl p-4 flex items-center justify-between hover:bg-card/35 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Link href={`/user/${user.username}`} className="flex-shrink-0">
                          <SafeAvatar
                            src={user.photoURL}
                            alt={user.displayName}
                            name={user.displayName}
                            size={44}
                            className="ring-1 ring-primary/20"
                          />
                        </Link>
                        
                        <div className="min-w-0 select-none">
                          <Link 
                            href={`/user/${user.username}`} 
                            className="font-bold text-white hover:underline hover:text-primary transition-all text-[14.5px] truncate block leading-normal"
                          >
                            {user.displayName}
                          </Link>
                          <span className="text-[12px] text-muted-foreground leading-none">@{user.username}</span>
                          {user.bio && (
                            <p className="text-[12.5px] text-gray-300 mt-1 line-clamp-1 leading-normal">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Followers Counts */}
                      <div className="text-[11px] font-bold text-muted-foreground text-right shrink-0 select-none pl-2 border-l border-white/5 space-y-0.5">
                        <div>{user.followers_count || 0} <span className="font-semibold text-gray-500">Followers</span></div>
                        <div>{user.following_count || 0} <span className="font-semibold text-gray-500">Following</span></div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Users />}
                  title="No users found"
                  description={`We couldn't find any movie community members matching "${query}".`}
                />
              )
            )}



            {/* Posts Tab Results */}
            {activeTab === "posts" && (
              postResults.length > 0 ? (
                <div className="space-y-4">
                  {postResults.map((post: any) => (
                    <div key={post.id} className="bg-card/25 border border-border/30 rounded-2xl p-4 shadow-sm">
                      <p className="text-zinc-300 text-sm whitespace-pre-wrap">{post.post_text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<MessageSquare />} title="No posts found" description="No matching thoughts." />
              )
            )}

            {/* Hashtags Tab Results */}
            {activeTab === "hashtags" && (
              hashtagResults.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hashtagResults.map((h: any) => (
                    <Link key={h.tag} href={`/tag/${h.tag}`} className="px-4 py-2 bg-card/25 border border-border/30 rounded-xl hover:bg-white/10 transition-colors text-white font-bold inline-flex items-center gap-1.5">
                      <Hash className="h-4 w-4 text-primary" />
                      {h.tag}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Hash />} title="No hashtags found" description="No matching tags." />
              )
            )}

          </div>
        ) : (
          /* Default Trending shelves */
          <div className="space-y-10 pt-4">
            <RecentAndTrendingSearches />
            {movies.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2 select-none">
                  <span className="text-lg">🔥</span>
                  <h2 className="text-[20px] font-bold tracking-tight text-white uppercase">
                    Trending Movies Today
                  </h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {movies.map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      posterPath={item.poster_path}
                      mediaType="movie"
                      rating={item.vote_average}
                      releaseDate={item.release_date}
                    />
                  ))}
                </div>
              </div>
            )}

            {tvShows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2 select-none">
                  <span className="text-lg">📺</span>
                  <h2 className="text-[20px] font-bold tracking-tight text-white uppercase">
                    Trending Shows Today
                  </h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {tvShows.map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.name}
                      posterPath={item.poster_path}
                      mediaType="tv"
                      rating={item.vote_average}
                      releaseDate={item.first_air_date}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      <PageLoadMeasure pageName="search" />
    </div>
  );
}

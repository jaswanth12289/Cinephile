import { 
  searchMovies, 
  searchTV, 
  searchPeople, 
  searchCollections, 
  getTrending 
} from "@/lib/tmdb/client";
import { searchUsers } from "@/actions/user.actions";
import { MediaCard } from "@/components/shared/MediaCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { SearchTabs } from "@/components/shared/SearchTabs";
import { RecentAndTrendingSearches } from "@/components/shared/RecentAndTrendingSearches";
import { Film, Tv, Users } from "lucide-react";
import Link from "next/link";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { PageLoadMeasure } from "@/components/shared/PageLoadMeasure";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; t?: string }>;
}) {
  const { q, t } = await searchParams;
  const query = q || "";
  const activeTab = t || "movies";

  let movieResults: any[] = [];
  let tvResults: any[] = [];
  let personResults: any[] = [];
  let userResults: any[] = [];
  let collectionResults: any[] = [];

  // Fetch only the active tab data. Never prefetch hidden tabs.
  let searchPromise: Promise<any> = Promise.resolve(null);
  
  if (query) {
    if (activeTab === "movies") {
      searchPromise = searchMovies(query);
    } else if (activeTab === "tv") {
      searchPromise = searchTV(query);
    } else if (activeTab === "people") {
      searchPromise = searchPeople(query);
    } else if (activeTab === "users") {
      searchPromise = searchUsers(query);
    } else if (activeTab === "collections") {
      searchPromise = searchCollections(query);
    }
  }

  const [searchResults, trendingMovies, trendingTV] = await Promise.all([
    searchPromise,
    getTrending("movie", "day"),
    getTrending("tv", "day"),
  ]);

  if (query) {
    if (activeTab === "movies") {
      movieResults = searchResults?.results || [];
    } else if (activeTab === "tv") {
      tvResults = searchResults?.results || [];
    } else if (activeTab === "people") {
      personResults = searchResults?.results || [];
    } else if (activeTab === "users") {
      userResults = searchResults || [];
    } else if (activeTab === "collections") {
      collectionResults = searchResults?.results || [];
    }
  }

  const movies = trendingMovies?.results?.slice(0, 5) || [];
  const tvShows = trendingTV?.results?.slice(0, 5) || [];

  // Determine result count for the active tab
  let resultsCount = 0;
  if (activeTab === "movies") resultsCount = movieResults.length;
  else if (activeTab === "tv") resultsCount = tvResults.length;
  else if (activeTab === "people") resultsCount = personResults.length;
  else if (activeTab === "users") resultsCount = userResults.length;
  else if (activeTab === "collections") resultsCount = collectionResults.length;

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

        {/* Search Bar Input */}
        <div className="flex gap-3 max-w-2xl bg-card/25 backdrop-blur-md p-2 rounded-2xl border border-border/30 shadow-md">
          <SearchInput defaultValue={query} activeTab={activeTab} />
        </div>

        {/* Results Stream */}
        {query ? (
          <div className="space-y-6">
            
            {/* Tabs Navigation (lazy load inactive tabs, trigger haptics inside SearchTabs client component) */}
            <SearchTabs
              activeTab={activeTab}
              query={query}
              movieCount={activeTab === "movies" ? movieResults.length : null}
              tvCount={activeTab === "tv" ? tvResults.length : null}
              personCount={activeTab === "people" ? personResults.length : null}
              userCount={activeTab === "users" ? userResults.length : null}
              collectionCount={activeTab === "collections" ? collectionResults.length : null}
            />

            {/* Results Header */}
            <div className="flex items-center justify-between text-[13px] text-muted-foreground font-semibold select-none">
              <span>Showing results for "{query}"</span>
              <span>{resultsCount} items found</span>
            </div>

            {/* Movies Tab Results */}
            {activeTab === "movies" && (
              movieResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  icon={Film}
                  title="No movies found"
                  description={`We couldn't find any movies matching "${query}". Check your spelling or try another search.`}
                />
              )
            )}

            {/* TV Shows Tab Results */}
            {activeTab === "tv" && (
              tvResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  icon={Tv}
                  title="No series found"
                  description={`We couldn't find any TV shows matching "${query}". Check your spelling or try another search.`}
                />
              )
            )}

            {/* People Tab Results */}
            {activeTab === "people" && (
              personResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  icon={Users}
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
                      key={user.uid}
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
                        <div>{user.followersCount} <span className="font-semibold text-gray-500">Followers</span></div>
                        <div>{user.followingCount} <span className="font-semibold text-gray-500">Following</span></div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description={`We couldn't find any movie community members matching "${query}".`}
                />
              )
            )}

            {/* Collections Tab Results */}
            {activeTab === "collections" && (
              collectionResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {collectionResults.map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.name}
                      posterPath={item.poster_path}
                      mediaType="movie"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Film}
                  title="No collections found"
                  description={`We couldn't find any collections matching "${query}".`}
                />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

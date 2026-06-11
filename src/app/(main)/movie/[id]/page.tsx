import { getMovieDetails } from "@/lib/tmdb/client";
import { getWatchStatus } from "@/actions/tracking.actions";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WatchButton } from "@/features/tracking/WatchButton";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { ReviewList } from "@/features/reviews/ReviewList";
import { Star, Clock, CalendarDays, Users, MessageSquare, Clapperboard, Activity, Coins, TrendingUp, Globe } from "lucide-react";
import { TrailerSection } from "@/components/shared/TrailerSection";
import { Suspense } from "react";
import { WatchProviders } from "@/components/shared/WatchProviders";
import { WatchProvidersSkeleton } from "@/components/skeletons/WatchProvidersSkeleton";
import { PageTransition } from "@/components/shared/PageTransition";

export default async function MoviePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ region?: string }> 
}) {
  const { id } = await params;
  const { region = "IN" } = await searchParams;
  const [movie, watchStatus] = await Promise.all([
    getMovieDetails(id),
    getWatchStatus(id),
  ]);

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const director = movie.credits?.crew?.find((c: any) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 8) ?? [];
  const trailer = movie.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );

  return (
    <PageTransition>
      <div className="relative min-h-screen pb-16 bg-[#09090F] overflow-hidden">
        {/* Ambient background glow of the poster/backdrop */}
        {backdropUrl && (
          <div className="absolute top-0 inset-x-0 h-[80vh] pointer-events-none overflow-hidden z-0 select-none opacity-25">
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-[80px] transform scale-110" 
              style={{ backgroundImage: `url(${backdropUrl})` }} 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090F]/70 to-[#09090F]" />
          </div>
        )}

        {/* Full-Bleed Backdrop Banner */}
        <div className="relative h-[55vh] md:h-[65vh] w-full overflow-hidden bg-black z-10">
          {backdropUrl ? (
            <Image
              src={backdropUrl}
              alt={movie.title}
              fill
              className="object-cover opacity-45 transform scale-102 filter blur-[1px] md:blur-0"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#101018] to-[#09090F]" />
          )}
          {/* Rich cinematic dark overlays to match Spotify/Netflix */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090F]/90 via-[#09090F]/30 to-transparent" />

          {/* Content overlaid on backdrop */}
          <div className="absolute inset-x-0 bottom-0 py-8">
            <div className="max-w-[1440px] mx-auto px-4 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
              {posterUrl && (
                <div className="relative w-36 aspect-[2/3] md:w-48 lg:w-56 shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#101018] transform hover:scale-[1.02] transition-transform duration-300">
                  <Image src={posterUrl} alt={movie.title} fill className="object-cover" sizes="(max-width: 768px) 150px, 250px" />
                </div>
              )}
              <div className="space-y-3.5 pb-2 md:pb-4 flex-1 min-w-0">
                <h1 className="text-[32px] sm:text-[44px] md:text-[52px] font-black leading-tight tracking-tight text-white drop-shadow-md font-display">
                  {movie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-300 font-extrabold select-none font-display">
                  {movie.release_date && (
                    <span className="flex items-center gap-1.5 bg-white/3 border border-white/5 px-2.5 py-1 rounded-lg">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {movie.release_date.split("-")[0]}
                    </span>
                  )}
                  {movie.runtime > 0 && (
                    <span className="flex items-center gap-1.5 bg-white/3 border border-white/5 px-2.5 py-1 rounded-lg">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  )}
                  {movie.vote_average > 0 && (
                    <span className="flex items-center gap-1.5 bg-white/3 border border-white/5 px-2.5 py-1 rounded-lg text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                      {movie.vote_average.toFixed(1)}
                      <span className="text-zinc-400 font-normal">
                        ({movie.vote_count?.toLocaleString()} votes)
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap pt-1 select-none font-display">
                  {movie.genres?.map((g: any) => (
                    <span key={g.id} className="text-[10px] font-extrabold uppercase tracking-wider bg-white/3 text-zinc-200 border border-white/5 px-3 py-1 rounded-full">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Main Body Grid */}
      <div className="max-w-[1440px] mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase font-display border-b border-white/5 pb-2">
              Overview
            </h2>
            <p className="text-[15.5px] leading-relaxed text-zinc-400 font-medium">
              {movie.overview}
            </p>
          </section>

          <Suspense fallback={<WatchProvidersSkeleton />}>
            <WatchProviders id={Number(id)} mediaType="movie" region={region} />
          </Suspense>

          {cast.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase font-display">
                  Cast Members
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {cast.map((actor: any) => (
                  <div key={actor.id} className="group flex flex-col cine-card cine-card-hover overflow-hidden shadow-md">
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/2">
                      {actor.profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt={actor.name}
                          fill
                          className="object-cover group-hover:scale-102 transition-transform duration-500"
                          sizes="(max-width: 640px) 150px, (max-width: 1024px) 120px, 100px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg font-black bg-white/3 uppercase font-display">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between bg-[#101018]/50">
                      <p className="text-xs font-bold text-white line-clamp-1 leading-tight group-hover:text-primary transition-colors duration-200 font-display">{actor.name}</p>
                      <p className="text-[10.5px] text-[#A1A1AA] line-clamp-1 mt-0.5 font-medium">{actor.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {trailer && (
            <TrailerSection
              youtubeKey={trailer.key}
              title={movie.title}
              backdropPath={movie.backdrop_path}
            />
          )}

          {/* Reviews */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase font-display">
                Reviews
              </h2>
            </div>
            <div className="space-y-6">
              <ReviewForm mediaId={id} mediaType="movie" />
              <ReviewList mediaId={id} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <WatchButton
            mediaId={id}
            mediaType="movie"
            initialStatus={watchStatus}
          />

          <div className="cine-glass p-5 rounded-2xl space-y-4.5 text-xs font-display z-10 relative">
            {director && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <Clapperboard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Director</p>
                  <p className="font-extrabold text-white text-[13px]">{director.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Status</p>
                <p className="font-extrabold text-white text-[13px]">{movie.status}</p>
              </div>
            </div>
            {movie.budget > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Budget</p>
                  <p className="font-extrabold text-white text-[13px]">${movie.budget?.toLocaleString()}</p>
                </div>
              </div>
            )}
            {movie.revenue > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Revenue</p>
                  <p className="font-extrabold text-white text-[13px]">${movie.revenue?.toLocaleString()}</p>
                </div>
              </div>
            )}
            {movie.original_language && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Language</p>
                  <p className="font-extrabold text-white text-[13px] uppercase">{movie.original_language}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </PageTransition>
);
}

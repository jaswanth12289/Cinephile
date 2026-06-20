import { getTVDetails } from "@/lib/tmdb/client";
import { getWatchStatus, getIsFavoriteMedia } from "@/actions/tracking.actions";
import { getUserRating, getReviews } from "@/actions/reviews.actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { CalendarDays, Tv, Globe, Clapperboard, MonitorPlay, Activity, Clock, Star } from "lucide-react";
import { Suspense } from "react";
import { WatchProviders } from "@/components/shared/WatchProviders";
import { WatchProvidersSkeleton } from "@/components/skeletons/WatchProvidersSkeleton";
import { PageTransition } from "@/components/shared/PageTransition";
import { TVRecommendations } from "@/components/shared/TVRecommendations";
import { CastSection } from "@/components/shared/CastSection";
import { MovieActionDock } from "@/components/shared/MovieActionDock";
import { ReviewsPreviewSection } from "@/components/shared/ReviewsPreviewSection";
import { VideosSection } from "@/components/shared/VideosSection";
import { CollapsibleWatchProviders } from "@/components/shared/CollapsibleWatchProviders";
import { OfflineDetailView } from "@/components/shared/OfflineDetailView";
import { OfflineCacheRegistrar } from "@/components/shared/OfflineCacheRegistrar";
import { CachedImage } from "@/components/shared/CachedImage";
import { PageLoadMeasure } from "@/components/shared/PageLoadMeasure";

export default async function TVPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ region?: string }> 
}) {
  const { id } = await params;
  const { region = "IN" } = await searchParams;

  let show;
  let watchStatus: "watched" | "watching" | "want_to_watch" | "dropped" | null = null;
  let isFavorite = false;
  let userRating: number | null = null;
  let reviews: any[] = [];
  let isOfflineFallback = false;
  try {
    const results = await Promise.all([
      getTVDetails(id),
      getWatchStatus(id),
      getIsFavoriteMedia(id),
      getUserRating(id),
      getReviews(id),
    ]);
    show = results[0];
    watchStatus = results[1];
    isFavorite = results[2];
    userRating = results[3];
    reviews = results[4];
  } catch (error: any) {
    const isNetworkError = 
      error?.message?.includes("fetch failed") || 
      error?.code === "ECONNRESET" || 
      error?.message?.includes("ECONNRESET") ||
      error?.message?.includes("socket") ||
      error?.message?.includes("dns");

    if (isNetworkError) {
      isOfflineFallback = true;
    } else {
      const is404 = error?.message?.includes("404") || error?.status === 404 || error?.status_code === 34;
      if (is404) {
        notFound();
      }
      throw error;
    }
  }

  if (isOfflineFallback) {
    return <OfflineDetailView id={id} mediaType="tv" />;
  }

  if (!show) {
    notFound();
  }

  const backdropUrl = show.backdrop_path
    ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
    : null;

  const posterUrl = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : null;

  const cast = show.credits?.cast ?? [];
  const creator = show.created_by?.[0];

  return (
    <PageTransition>
      <div className="relative min-h-screen pb-16 bg-[#09090F] overflow-hidden">
        {/* Ambient background glow */}
        {backdropUrl && (
          <div className="absolute top-0 inset-x-0 h-[60vh] pointer-events-none overflow-hidden z-0 select-none opacity-20">
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-[60px] transform scale-110" 
              style={{ backgroundImage: `url(${backdropUrl})` }} 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090F]/80 to-[#09090F]" />
          </div>
        )}

        {/* Shorter Full-Bleed Backdrop Banner */}
        <div className="relative h-[25vh] sm:h-[30vh] md:h-[38vh] w-full overflow-hidden bg-black z-10">
          {backdropUrl ? (
            <Image
              src={backdropUrl}
              alt={show.name}
              fill
              className="object-cover opacity-35"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#101018] to-[#09090F]" />
          )}
          {/* Rich cinematic dark overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090F]/80 via-transparent to-transparent" />
        </div>

        {/* Poster & Main Info Section - overlapping the backdrop */}
        <div className="max-w-[1440px] mx-auto px-4 relative z-20 -mt-16 sm:-mt-24 md:-mt-28">
          <div className="flex gap-4 md:gap-6 items-start md:items-end">
            {posterUrl && (
              <div className="relative w-24 sm:w-36 md:w-44 lg:w-48 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#101018] transform hover:scale-[1.01] transition-transform duration-300">
                <CachedImage src={posterUrl} alt={show.name} fill className="object-cover" sizes="(max-width: 640px) 96px, (max-width: 768px) 144px, 200px" priority cacheEnabled={true} />
              </div>
            )}
            <div className="space-y-1.5 sm:space-y-2.5 flex-1 min-w-0 text-left pb-1">
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md font-display line-clamp-2">
                {show.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-300 font-extrabold font-display select-none">
                {show.first_air_date && (
                  <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                    <CalendarDays className="h-3 w-3 text-primary" />
                    {show.first_air_date.split("-")[0]}
                  </span>
                )}
                <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                  <Tv className="h-3 w-3 text-primary" />
                  {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? "s" : ""}
                </span>
                {show.vote_average > 0 && (
                  <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                    {show.vote_average.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="flex gap-1 flex-wrap pt-0.5 select-none font-display">
                {show.genres?.map((g: any) => (
                  <span key={g.id} className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-white/5 text-zinc-300 border border-white/5 px-2 py-0.5 rounded-md">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="max-w-[1440px] mx-auto px-4 mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-2.5">
              <h2 className="text-base md:text-lg font-black tracking-tight text-white uppercase font-display border-b border-white/5 pb-2">
                Overview
              </h2>
              <p className="text-[14.5px] leading-relaxed text-zinc-400 font-medium">
                {show.overview}
              </p>
            </section>

            {/* Action Dock (Critical) */}
            <MovieActionDock
              mediaId={id}
              mediaType="tv"
              initialWatchStatus={watchStatus}
              initialIsFavorite={isFavorite}
              initialUserRating={userRating}
            />

            {/* Reviews Preview (Important) */}
            <section className="space-y-6">
              <ReviewsPreviewSection reviews={reviews} mediaId={id} />
              <ReviewForm mediaId={id} mediaType="tv" />
            </section>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="cine-glass p-5 rounded-2xl space-y-4.5 text-xs font-display z-10 relative">
              {creator && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                    <Clapperboard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Created By</p>
                    <p className="font-extrabold text-white text-[13px]">{creator.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Status</p>
                  <p className="font-extrabold text-white text-[13px]">{show.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                  <MonitorPlay className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Network</p>
                  <p className="font-extrabold text-white text-[13px]">{show.networks?.[0]?.name ?? "—"}</p>
                </div>
              </div>
              {show.episode_run_time?.[0] && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Episode Runtime</p>
                    <p className="font-extrabold text-white text-[13px]">{show.episode_run_time[0]} min</p>
                  </div>
                </div>
              )}
              {show.original_language && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/10 text-primary shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-[9px] uppercase tracking-wider font-black">Language</p>
                    <p className="font-extrabold text-white text-[13px] uppercase">{show.original_language}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Width Sections (Cast, Recommendations, Trailers) */}
        <div className="max-w-[1440px] mx-auto px-4 mt-8 space-y-8">
          {/* Cast Avatars (Important) */}
          {cast.length > 0 && (
            <CastSection cast={cast} />
          )}

          {/* Recommendations Carousel (Important) */}
          <Suspense fallback={
            <div className="space-y-3">
              <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display border-b border-white/5 pb-2 select-none">
                Recommendations
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 py-1 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="rounded-xl bg-[#101018] border border-white/5 aspect-[2/3] w-full" />
                ))}
              </div>
            </div>
          }>
            <TVRecommendations id={id} />
          </Suspense>

          {/* Trailer + Videos (Optional) */}
          {show.videos?.results && show.videos.results.length > 0 && (
            <VideosSection
              videos={show.videos.results}
              title={show.name}
              backdropPath={show.backdrop_path}
            />
          )}

          {/* Watch Providers (Optional, Collapsible at bottom) */}
          <CollapsibleWatchProviders>
            <Suspense fallback={<WatchProvidersSkeleton />}>
              <WatchProviders id={Number(id)} mediaType="tv" region={region} />
            </Suspense>
          </CollapsibleWatchProviders>
        </div>
        {/* Cache Registrar */}
        <OfflineCacheRegistrar id={id} mediaType="tv" data={show} />
        <PageLoadMeasure pageName="tv_details" id={id} />
      </div>
    </PageTransition>
  );
}

import { getTVDetails } from "@/lib/tmdb/client";
import { getWatchStatus } from "@/actions/tracking.actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WatchButton } from "@/features/tracking/WatchButton";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { ReviewList } from "@/features/reviews/ReviewList";
import { Star, CalendarDays, Tv, MessageSquare } from "lucide-react";
import { TrailerSection } from "@/components/shared/TrailerSection";
import { Suspense } from "react";
import { WatchProviders } from "@/components/shared/WatchProviders";
import { WatchProvidersSkeleton } from "@/components/skeletons/WatchProvidersSkeleton";
import { SafeImage } from "@/components/shared/SafeImage";
import { RecommendationsGrid } from "@/components/shared/RecommendationsGrid";
import { TVRecommendations } from "@/components/shared/TVRecommendations";
import { CastSection } from "@/components/shared/CastSection";

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
  let watchStatus;
  try {
    const results = await Promise.all([
      getTVDetails(id),
      getWatchStatus(id),
    ]);
    show = results[0];
    watchStatus = results[1];
  } catch (error: any) {
    const is404 = error?.message?.includes("404") || error?.status === 404 || error?.status_code === 34;
    if (is404) {
      notFound();
    }
    throw error;
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
  const trailer = show.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );
  const creator = show.created_by?.[0];

  return (
    <div className="min-h-screen pb-16 bg-[#09090F] overflow-hidden">
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
              <Image src={posterUrl} alt={show.name} fill className="object-cover" sizes="(max-width: 640px) 96px, (max-width: 768px) 144px, 200px" priority />
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

          <Suspense fallback={<WatchProvidersSkeleton />}>
            <WatchProviders id={Number(id)} mediaType="tv" region={region} />
          </Suspense>

          {cast.length > 0 && (
            <CastSection cast={cast} />
          )}

          {trailer && (
            <TrailerSection
              youtubeKey={trailer.key}
              title={show.name}
              backdropPath={show.backdrop_path}
            />
          )}

          <Suspense fallback={<RecommendationsGrid title="Recommendations" mediaType="tv" loading={true} />}>
            <TVRecommendations id={id} />
          </Suspense>

          {/* Reviews */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/30 pb-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-[24px] font-black tracking-tight text-white uppercase">
                Reviews
              </h2>
            </div>
            <div className="space-y-6">
              <ReviewForm mediaId={id} mediaType="tv" />
              <ReviewList mediaId={id} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <WatchButton
            mediaId={id}
            mediaType="tv"
            initialStatus={watchStatus}
          />

          <div className="bg-card/25 backdrop-blur-md rounded-2xl border border-border/30 p-5 space-y-4 text-[14px]">
            {creator && (
              <div>
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">Created By</p>
                <p className="font-extrabold text-white">{creator.name}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">Status</p>
              <p className="font-extrabold text-white">{show.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">Network</p>
              <p className="font-extrabold text-white">{show.networks?.[0]?.name ?? "—"}</p>
            </div>
            {show.episode_run_time?.[0] && (
              <div>
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">Episode Runtime</p>
                <p className="font-extrabold text-white">{show.episode_run_time[0]} min</p>
              </div>
            )}
            {show.original_language && (
              <div>
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">Language</p>
                <p className="font-extrabold text-white uppercase">{show.original_language}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

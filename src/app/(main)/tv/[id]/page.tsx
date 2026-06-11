import { getTVDetails } from "@/lib/tmdb/client";
import { getWatchStatus } from "@/actions/tracking.actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WatchButton } from "@/features/tracking/WatchButton";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { ReviewList } from "@/features/reviews/ReviewList";
import { Star, CalendarDays, Tv, Users, MessageSquare } from "lucide-react";
import { TrailerSection } from "@/components/shared/TrailerSection";
import { Suspense } from "react";
import { WatchProviders } from "@/components/shared/WatchProviders";
import { WatchProvidersSkeleton } from "@/components/skeletons/WatchProvidersSkeleton";
import { SafeImage } from "@/components/shared/SafeImage";
import { CarouselSection } from "@/components/shared/CarouselSection";
import { TVRecommendations } from "@/components/shared/TVRecommendations";

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

  const cast = show.credits?.cast?.slice(0, 8) ?? [];
  const trailer = show.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );
  const creator = show.created_by?.[0];

  return (
    <div className="min-h-screen pb-16 bg-[#0F0F1A]">
      {/* Full-Bleed Backdrop Banner */}
      <div className="relative h-[55vh] md:h-[65vh] w-full overflow-hidden bg-black">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={show.name}
            fill
            className="object-cover opacity-45 transform scale-105 filter blur-[1px] md:blur-0"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#161623] to-[#0F0F1A]" />
        )}
        {/* Rich cinematic dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F1A] via-[#0F0F1A]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F1A]/90 via-[#0F0F1A]/30 to-transparent" />

        {/* Content overlaid on backdrop */}
        <div className="absolute inset-x-0 bottom-0 py-8">
          <div className="max-w-[1440px] mx-auto px-4 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
            {posterUrl && (
              <div className="relative w-36 aspect-[2/3] md:w-48 lg:w-56 shrink-0 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl ring-1 ring-white/5 bg-[#161623] transform hover:scale-[1.02] transition-transform duration-300">
                <Image src={posterUrl} alt={show.name} fill className="object-cover" sizes="(max-width: 768px) 150px, 250px" priority />
              </div>
            )}
            <div className="space-y-3 pb-2 md:pb-4 flex-1 min-w-0">
              <h1 className="text-[32px] sm:text-[44px] md:text-[52px] font-black leading-tight tracking-tight text-white drop-shadow-md">
                {show.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] md:text-[14px] text-gray-300 font-bold select-none">
                {show.first_air_date && (
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {show.first_air_date.split("-")[0]}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  <Tv className="h-3.5 w-3.5 text-primary" />
                  {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? "s" : ""}
                  {" · "}{show.number_of_episodes} Episodes
                </span>
                {show.vote_average > 0 && (
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                    {show.vote_average.toFixed(1)}
                    <span className="text-gray-400 font-normal">
                      ({show.vote_count?.toLocaleString()} votes)
                    </span>
                  </span>
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap pt-1 select-none">
                {show.genres?.map((g: any) => (
                  <Badge key={g.id} className="text-[11px] font-black uppercase tracking-wider bg-white/5 text-gray-200 border-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded-md">
                    {g.name}
                  </Badge>
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
            <h2 className="text-[24px] font-black tracking-tight text-white uppercase border-b border-border/30 pb-2">
              Overview
            </h2>
            <p className="text-[16px] leading-relaxed text-muted-foreground font-medium">
              {show.overview}
            </p>
          </section>

          <Suspense fallback={<WatchProvidersSkeleton />}>
            <WatchProviders id={Number(id)} mediaType="tv" region={region} />
          </Suspense>

          {cast.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-[24px] font-black tracking-tight text-white uppercase">
                  Cast Members
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {cast.map((actor: any) => (
                  <div key={actor.id} className="group flex flex-col bg-card/25 border border-border/30 rounded-xl overflow-hidden shadow-md hover:border-primary/40 hover:bg-card/40 transition-all duration-300">
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/20">
                      {actor.profile_path ? (
                        <SafeImage
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt={actor.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 150px, (max-width: 1024px) 120px, 100px"
                          fallbackSrc="/placeholder-poster.svg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-black bg-white/5 uppercase">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col justify-between bg-black/10">
                      <p className="text-[13px] font-black text-white line-clamp-1 leading-tight group-hover:text-primary transition-colors duration-200">{actor.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-medium">{actor.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {trailer && (
            <TrailerSection
              youtubeKey={trailer.key}
              title={show.name}
              backdropPath={show.backdrop_path}
            />
          )}

          <Suspense fallback={<CarouselSection title="Recommendations" data={[]} loading={true} mediaType="tv" iconName="sparkles" />}>
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

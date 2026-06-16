"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, Clock, CalendarDays } from "lucide-react";
import { getCachedMovieDetails, getCachedTVDetails } from "@/lib/offline/offlineCache";

interface OfflineDetailViewProps {
  id: string;
  mediaType: "movie" | "tv";
}

export function OfflineDetailView({ id, mediaType }: OfflineDetailViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCache() {
      try {
        const cached = mediaType === "movie" 
          ? await getCachedMovieDetails(id)
          : await getCachedTVDetails(id);
        setData(cached);
      } catch (err) {
        console.warn("Offline cache retrieval failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCache();
  }, [id, mediaType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center text-zinc-450 select-none animate-pulse">
        Loading offline cache...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090F] flex flex-col items-center justify-center p-6 text-center select-none text-white">
        <span className="text-4xl mb-4">🔌</span>
        <h1 className="text-lg font-black uppercase tracking-wider font-display">Offline and Uncached</h1>
        <p className="text-xs text-zinc-500 max-w-xs mt-2 leading-relaxed">
          This page hasn't been cached. Connect to the internet to view details.
        </p>
        <Link 
          href="/discover"
          className="mt-6 px-5 py-2.5 bg-primary rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/95 transition-all"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const title = data.title || data.name || "";
  const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null;
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
  const year = (data.release_date || data.first_air_date || "").split("-")[0];
  const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null);

  return (
    <div className="relative min-h-screen pb-16 bg-[#09090F] overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-40">
        <Link 
          href="/discover"
          className="p-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {backdropUrl && (
        <div className="absolute top-0 inset-x-0 h-[60vh] pointer-events-none overflow-hidden z-0 select-none opacity-20">
          <div 
            className="absolute inset-0 bg-cover bg-center filter blur-[60px] transform scale-110" 
            style={{ backgroundImage: `url(${backdropUrl})` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090F]/80 to-[#09090F]" />
        </div>
      )}

      {/* Backdrop banner */}
      <div className="relative h-[25vh] sm:h-[30vh] md:h-[38vh] w-full overflow-hidden bg-black z-10">
        {backdropUrl ? (
          <Image src={backdropUrl} alt={title} fill className="object-cover opacity-35" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#101018] to-[#09090F]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/45 to-transparent" />
      </div>

      {/* Main content info */}
      <div className="max-w-[1440px] mx-auto px-4 relative z-20 -mt-16 sm:-mt-24 md:-mt-28">
        <div className="flex gap-4 md:gap-6 items-start md:items-end">
          {posterUrl && (
            <div className="relative w-24 sm:w-36 md:w-44 lg:w-48 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#101018]">
              <Image src={posterUrl} alt={title} fill className="object-cover" sizes="200px" priority />
            </div>
          )}
          <div className="space-y-1.5 sm:space-y-2.5 flex-1 min-w-0 text-left pb-1">
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md font-display line-clamp-2">
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-300 font-extrabold font-display select-none">
              {year && (
                <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                  <CalendarDays className="h-3 w-3 text-primary" />
                  {year}
                </span>
              )}
              {runtime && (
                <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                  <Clock className="h-3 w-3 text-primary" />
                  {runtime}m
                </span>
              )}
              {data.vote_average > 0 && (
                <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                  {data.vote_average.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 mt-6 md:mt-8 space-y-6">
        {/* Offline Banner */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-400 select-none">
          <span className="text-lg">🔌</span>
          <div>
            <p className="text-[12.5px] font-black uppercase tracking-wide font-display">Offline Mode</p>
            <p className="text-[10.5px] text-amber-500/80 font-medium">Viewing cached details copy because your device is offline.</p>
          </div>
        </div>

        {/* Overview */}
        <section className="space-y-2.5">
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display border-b border-white/5 pb-2">
            Overview
          </h2>
          <p className="text-[14.5px] leading-relaxed text-zinc-400 font-medium">
            {data.overview}
          </p>
        </section>
      </div>
    </div>
  );
}

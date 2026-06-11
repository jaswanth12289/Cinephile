import React from "react";
import { WatchProvidersSkeleton } from "./WatchProvidersSkeleton";

export function MovieTvDetailsSkeleton() {
  return (
    <div className="relative min-h-screen pb-16 bg-[#09090F] overflow-hidden animate-pulse select-none">
      {/* 1. Shorter Backdrop Banner Placeholder */}
      <div className="relative h-[25vh] sm:h-[30vh] md:h-[38vh] w-full bg-zinc-950/80 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-transparent to-transparent z-10" />
      </div>

      {/* 2. Poster & Metadata Placement (Overlapping) */}
      <div className="max-w-[1440px] mx-auto px-4 relative z-20 -mt-16 sm:-mt-24 md:-mt-28">
        <div className="flex gap-4 md:gap-6 items-start md:items-end">
          <div className="w-24 sm:w-36 md:w-44 lg:w-48 aspect-[2/3] shrink-0 rounded-xl bg-zinc-800/40 border border-white/5 shadow-2xl" />
          
          <div className="space-y-2.5 pb-1 flex-1 w-full">
            <div className="h-8 w-2/3 md:w-1/2 bg-zinc-800/60 rounded-xl" />
            <div className="flex gap-2">
              <div className="h-5 w-12 bg-zinc-850/40 rounded-md" />
              <div className="h-5 w-16 bg-zinc-850/40 rounded-md" />
              <div className="h-5 w-14 bg-zinc-850/40 rounded-md" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-4.5 w-14 bg-zinc-850/20 rounded-md" />
              <div className="h-4.5 w-14 bg-zinc-850/20 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="max-w-[1440px] mx-auto px-4 mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Overview */}
          <section className="space-y-2.5">
            <div className="h-5 w-24 bg-zinc-800/50 rounded-md" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-900/40 rounded" />
              <div className="h-4 w-full bg-zinc-900/40 rounded" />
              <div className="h-4 w-5/6 bg-zinc-900/40 rounded" />
            </div>
          </section>

          {/* Watch Providers Skeleton */}
          <WatchProvidersSkeleton />

          {/* Cast members horizontal scroll skeleton */}
          <section className="space-y-3">
            <div className="h-5 w-32 bg-zinc-800/50 rounded-md" />
            <div className="flex gap-4 overflow-x-hidden -mx-4 px-4 select-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center shrink-0 w-16 sm:w-20 space-y-2">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-zinc-900/40 border border-white/5" />
                  <div className="h-3 w-12 bg-zinc-800/55 rounded animate-pulse" />
                  <div className="h-2.5 w-10 bg-zinc-850/45 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-4">
          {/* Watch Action Button */}
          <div className="h-11 w-full bg-zinc-800/45 rounded-xl" />

          {/* Info Card List */}
          <div className="bg-card/25 border border-white/5 p-5 rounded-2xl space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-850/40 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-2.5 w-12 bg-zinc-850/20 rounded" />
                  <div className="h-3.5 w-24 bg-zinc-800/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

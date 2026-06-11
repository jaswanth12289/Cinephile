import React from "react";
import { WatchProvidersSkeleton } from "./WatchProvidersSkeleton";

export function MovieTvDetailsSkeleton() {
  return (
    <div className="relative min-h-screen pb-16 bg-[#09090F] overflow-hidden animate-pulse select-none">
      {/* 1. Backdrop Banner Placeholder */}
      <div className="relative h-[55vh] md:h-[65vh] w-full bg-zinc-950/80 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-transparent to-transparent z-10" />
        <div className="absolute inset-x-0 bottom-0 py-8 z-20">
          <div className="max-w-[1440px] mx-auto px-4 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
            {/* Poster Placement */}
            <div className="w-36 aspect-[2/3] md:w-48 lg:w-56 shrink-0 rounded-2xl bg-zinc-800/40 border border-white/5 shadow-2xl" />
            
            {/* Metadata Text */}
            <div className="space-y-4 pb-2 md:pb-4 flex-1 w-full">
              <div className="h-10 w-2/3 md:w-1/2 bg-zinc-800/60 rounded-xl" />
              <div className="flex gap-3">
                <div className="h-5.5 w-16 bg-zinc-850/40 rounded-md" />
                <div className="h-5.5 w-24 bg-zinc-850/40 rounded-md" />
                <div className="h-5.5 w-20 bg-zinc-850/40 rounded-md" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-zinc-850/20 rounded-full" />
                <div className="h-5 w-16 bg-zinc-850/20 rounded-full" />
                <div className="h-5 w-16 bg-zinc-850/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="max-w-[1440px] mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Overview */}
          <section className="space-y-3">
            <div className="h-6 w-32 bg-zinc-800/50 rounded-md" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-900/40 rounded" />
              <div className="h-4 w-full bg-zinc-900/40 rounded" />
              <div className="h-4 w-5/6 bg-zinc-900/40 rounded" />
            </div>
          </section>

          {/* Watch Providers Skeleton */}
          <WatchProvidersSkeleton />

          {/* Cast members grid */}
          <section className="space-y-4">
            <div className="h-6 w-40 bg-zinc-800/50 rounded-md" />
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col bg-card/10 border border-white/5 rounded-xl overflow-hidden shadow-md space-y-2.5 pb-3">
                  <div className="aspect-[2/3] w-full bg-zinc-900/40" />
                  <div className="px-2 space-y-1.5">
                    <div className="h-3 w-4/5 bg-zinc-800/55 rounded" />
                    <div className="h-2.5 w-3/5 bg-zinc-850/45 rounded" />
                  </div>
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

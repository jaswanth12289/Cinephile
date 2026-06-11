import React from "react";

export function ProfileHeaderSkeleton() {
  return (
    <div className="w-full space-y-4 select-none pb-6">
      {/* 192px height banner bar */}
      <div className="h-48 w-full bg-zinc-800/40 animate-pulse relative rounded-b-xl" />

      <div className="max-w-[1440px] mx-auto px-6">
        {/* 80px circular avatar overlapping banner */}
        <div className="-mt-10 relative h-20 w-20 rounded-full border-4 border-[#0F0F1A] bg-zinc-800 animate-pulse" />

        <div className="mt-4 space-y-3">
          {/* displayName bar */}
          <div className="h-6 w-40 bg-zinc-850 rounded animate-pulse" />
          
          {/* username bar */}
          <div className="h-4 w-24 bg-zinc-900 rounded animate-pulse" />

          {/* stats row (5 bars h-4 w-16 rounded each) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

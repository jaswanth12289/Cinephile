import React from "react";

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] pb-16 select-none">
      {/* Profile Hero Backdrop Banner Placeholder */}
      <div className="h-60 md:h-72 bg-card/25 w-full relative border-b border-white/5 animate-pulse" />

      {/* Profile Info Container */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        
        {/* Name, Avatar & Stats Card */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 mb-8 relative z-10">
          {/* Avatar Placeholder */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-[#0F0F1A] bg-muted/40 animate-pulse shrink-0" />

          {/* User Details Title and Stats */}
          <div className="flex flex-1 flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
            <div className="space-y-3 w-full max-w-md">
              {/* Display Name */}
              <div className="h-8 w-2/3 bg-muted/45 rounded animate-pulse" />
              {/* Username */}
              <div className="h-4.5 w-1/3 bg-muted/30 rounded animate-pulse" />
              
              {/* Stats Line */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-4 w-20 bg-muted/25 rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted/25 rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted/25 rounded animate-pulse" />
              </div>
            </div>

            {/* Follow Button Placeholder */}
            <div className="h-9 w-24 bg-muted/35 rounded-xl animate-pulse shrink-0" />
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          
          {/* Left Column: Sidebar details */}
          <div className="space-y-4">
            {/* Bio Card Placeholder */}
            <div className="bg-card/25 p-4 rounded-xl border border-border/30 shadow-md space-y-2">
              <div className="h-3 w-12 bg-muted/45 rounded animate-pulse" />
              <div className="h-4 w-full bg-muted/25 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted/25 rounded animate-pulse" />
            </div>
          </div>

          {/* Right Column: Favorites & Activities */}
          <div className="md:col-span-3 space-y-6">
            {/* Favorites Section Placeholder */}
            <div className="bg-card/25 p-4 rounded-xl border border-border/30 shadow-md space-y-3">
              <div className="h-4 w-32 bg-muted/45 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-3">
                <div className="aspect-[2/3] bg-muted/20 rounded-lg animate-pulse" />
                <div className="aspect-[2/3] bg-muted/20 rounded-lg animate-pulse" />
                <div className="aspect-[2/3] bg-muted/20 rounded-lg animate-pulse" />
                <div className="aspect-[2/3] bg-muted/20 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Activities Section Placeholder */}
            <div className="space-y-4">
              <div className="h-5 w-40 bg-muted/45 rounded animate-pulse pb-1" />
              <div className="h-32 bg-card/20 border border-border/20 rounded-xl animate-pulse" />
              <div className="h-32 bg-card/20 border border-border/20 rounded-xl animate-pulse" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

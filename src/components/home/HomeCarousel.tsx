"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  progress?: number;
  totalDuration?: number;
  lastWatchedAt?: string;
  status?: string;
}

interface HomeCarouselProps {
  title: string;
  seeAllHref?: string;
  items: (MediaItem | null | undefined)[];
  mediaType?: "movie" | "tv";
  variant?: "default" | "continueWatching";
}

// Format time ago
function formatTimeAgo(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function PosterCard({ item, mediaType, variant }: { item: MediaItem; mediaType: string; variant?: "default" | "continueWatching" }) {
  const [imgError, setImgError] = useState(false);
  const displayTitle = item.title || item.name || "Unknown";
  const year = item.release_date || item.first_air_date
    ? new Date((item.release_date || item.first_air_date)!).getFullYear()
    : null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const type = item.media_type || mediaType;
  const posterUrl = item.poster_path && !imgError
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : null;
    
  const isContinueWatching = variant === "continueWatching";
  
  // Progress calculations
  const progressPercent = item.progress && item.totalDuration 
    ? Math.min(100, Math.round((item.progress / item.totalDuration) * 100)) 
    : (item.progress && item.progress <= 100 ? item.progress : 0); // fallback if progress is already a percentage

  return (
    <Link href={`/${type}/${item.id}`} className={cn("group block shrink-0", isContinueWatching ? "w-[150px] sm:w-[170px] md:w-[190px]" : "w-[130px] sm:w-[145px] md:w-[155px]")}>
      {/* Poster */}
      <div className={cn("relative w-full rounded-xl overflow-hidden bg-slate-800/50 border border-white/[0.06] transition-all duration-200 group-hover:border-white/15 group-hover:shadow-2xl group-hover:shadow-black/50", isContinueWatching ? "aspect-video group-hover:scale-[1.02]" : "aspect-[2/3] group-hover:scale-[1.03]")}>
        {posterUrl ? (
          <Image
            src={isContinueWatching && item.backdrop_path ? `https://image.tmdb.org/t/p/w300${item.backdrop_path}` : posterUrl}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes={isContinueWatching ? "(max-width: 640px) 150px, (max-width: 768px) 170px, 190px" : "(max-width: 640px) 130px, (max-width: 768px) 145px, 155px"}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <svg className="h-10 w-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}

        {/* Rating badge (only for default variant) */}
        {!isContinueWatching && rating && parseFloat(rating) > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/75 backdrop-blur-sm text-amber-400 border border-amber-400/20">
            <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" />
            {rating}
          </div>
        )}
        
        {/* Continue Watching Overlay Elements */}
        {isContinueWatching && (
          <>
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
            {/* Play/Resume Button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center pl-1 shadow-lg backdrop-blur-sm">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
            
            {/* Progress Bar */}
            {progressPercent > 0 && (
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-900/80">
                <div 
                  className="h-full bg-red-600 rounded-r-sm" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            )}
          </>
        )}

        {/* Gradient overlay on hover for title */}
        {!isContinueWatching && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Title and details below */}
      <div className="mt-2 px-0.5 flex flex-col min-h-[36px]">
        <p className="text-[11.5px] sm:text-xs font-semibold text-slate-200 group-hover:text-white transition-colors leading-tight line-clamp-2">
          {displayTitle}
        </p>
        
        {isContinueWatching ? (
          <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
            {item.status === "paused" ? <span className="text-amber-500">PAUSED</span> : <span className="text-emerald-500">WATCHING</span>}
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="truncate">{formatTimeAgo(item.lastWatchedAt)}</span>
          </p>
        ) : (
          year && <p className="text-[10px] text-slate-500 mt-0.5">{year}</p>
        )}
      </div>
    </Link>
  );
}

export function HomeCarousel({ title, seeAllHref, items, mediaType = "movie", variant = "default" }: HomeCarouselProps) {
  if (!items || items.filter(Boolean).length === 0) return null;

  const validItems = items.filter((item): item is MediaItem => item != null);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors whitespace-nowrap"
          >
            See all
          </Link>
        )}
      </div>

      {/* Horizontal scrolling shelf */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5 lg:-mx-8 lg:px-8">
        {validItems.map((item) => (
          <PosterCard key={`${item.id}-${item.media_type || mediaType}`} item={item} mediaType={mediaType} variant={variant} />
        ))}
      </div>
    </section>
  );
}

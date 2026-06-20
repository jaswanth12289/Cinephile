"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Plus, 
  Check, 
  Heart, 
  Share2, 
  Star, 
  Clock, 
  CalendarDays, 
  Clapperboard, 
  Globe, 
  Users, 
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Activity,
  Coins
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { setWatchStatus, toggleFavoriteMedia } from "@/actions/tracking.actions";
import { createReview } from "@/actions/reviews.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { triggerHapticLight, triggerHapticMedium, triggerHapticSuccess } from "@/lib/native/haptics";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/shared/SafeImage";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { TrailerModal } from "@/components/shared/TrailerModal";
import { ReviewsPreviewSection } from "@/components/shared/ReviewsPreviewSection";
import { ReviewForm } from "@/features/reviews/ReviewForm";

interface Actor {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface MediaDetailsClientProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  media: any;
  initialWatchStatus: "watched" | "watching" | "want_to_watch" | "dropped" | null;
  initialIsFavorite: boolean;
  initialUserRating: number | null;
  reviews: any[];
  region: string;
  watchProvidersComponent: React.ReactNode;
  recommendationsComponent: React.ReactNode;
}

export function MediaDetailsClient({
  mediaId,
  mediaType,
  media,
  initialWatchStatus,
  initialIsFavorite,
  initialUserRating,
  reviews = [],
  region,
  watchProvidersComponent,
  recommendationsComponent
}: MediaDetailsClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  // Local interactive states
  const [watchStatus, setWatchStatusState] = useState(initialWatchStatus);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract director / creator
  const director = mediaType === "movie"
    ? media.credits?.crew?.find((c: any) => c.job === "Director")
    : null;
  const creator = mediaType === "tv"
    ? media.created_by?.[0]
    : null;
  const creatorName = director ? director.name : creator ? creator.name : "N/A";

  const cast: Actor[] = media.credits?.cast || [];
  const displayCast = cast.slice(0, 10);
  const hasMoreCast = cast.length > 10;

  // Extract trailer video key
  const trailerVideo = media.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  ) || media.videos?.results?.find((v: any) => v.site === "YouTube");
  const trailerKey = trailerVideo?.key;

  // Trigger toast alert
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Watch status toggle
  const handleToggleWatchlist = () => {
    if (!user) { router.push("/login"); return; }
    triggerHapticMedium();
    const nextStatus = watchStatus === "want_to_watch" ? null : "want_to_watch";
    setWatchStatusState(nextStatus);
    startTransition(async () => {
      await setWatchStatus(mediaId, mediaType, nextStatus);
      router.refresh();
      triggerToast(nextStatus ? "Added to Watchlist!" : "Removed from Watchlist.");
    });
  };

  // Favorites toggle
  const handleToggleFavorite = () => {
    if (!user) { router.push("/login"); return; }
    triggerHapticMedium();
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);
    startTransition(async () => {
      const res = await toggleFavoriteMedia(mediaId, mediaType);
      if (res.success) {
        setIsFavorite(res.isFavorite ?? false);
        router.refresh();
        triggerToast(res.isFavorite ? "Marked as Favorite!" : "Removed from Favorites.");
      }
    });
  };

  // Star rating rating
  const handleRate = (stars: number) => {
    if (!user) { router.push("/login"); return; }
    triggerHapticLight();
    setUserRating(stars);
    startTransition(async () => {
      await createReview(mediaId, mediaType, stars, "", false);
      router.refresh();
      triggerHapticSuccess();
      triggerToast(`Rated ${stars} Stars!`);
    });
  };

  // Share action (Native + Web hybrid)
  const handleShare = async () => {
    triggerHapticLight();
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = media.title || media.name || "Cinephile Curation";
    const shareText = `Check out "${shareTitle}" on Cinephile!`;

    // Dynamic native sharing check
    if (Capacitor.isNativePlatform()) {
      try {
        // @ts-ignore
        const { Share: CapShare } = await import("@capacitor/share");
        await CapShare.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          dialogTitle: "Share movie details",
        });
        return;
      } catch (e) {
        console.warn("Capacitor share failed, falling back:", e);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerToast("Link copied to clipboard!");
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const backdropUrl = media.backdrop_path
    ? `https://image.tmdb.org/t/p/original${media.backdrop_path}`
    : null;
  const posterUrl = media.poster_path
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  return (
    <div className="relative min-h-screen bg-[#05070A] overflow-hidden select-none pb-24 md:pb-12">
      {/* Ambient background glow of the backdrop */}
      {backdropUrl && (
        <div className="absolute top-0 inset-x-0 h-[60vh] pointer-events-none overflow-hidden z-0 select-none opacity-20">
          <div 
            className="absolute inset-0 bg-cover bg-center filter blur-[70px] transform scale-110" 
            style={{ backgroundImage: `url(${backdropUrl})` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05070A]/85 to-[#05070A]" />
        </div>
      )}

      {/* 1. Hero Backdrop Section */}
      <div className="relative h-[25vh] sm:h-[30vh] md:h-[38vh] w-full overflow-hidden bg-black z-10 select-none">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={media.title || media.name}
            fill
            className="object-cover opacity-35"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1A] to-[#05070A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070A] via-[#05070A]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070A]/85 via-transparent to-transparent" />
      </div>

      {/* Poster & Title overlap */}
      <div className="max-w-[1440px] mx-auto px-4 relative z-20 -mt-16 sm:-mt-24 md:-mt-28">
        <div className="flex gap-4.5 md:gap-6.5 items-start md:items-end">
          {posterUrl && (
            <div className="relative w-24 sm:w-36 md:w-44 lg:w-48 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A0F1A] transform transition-transform duration-300">
              <Image 
                src={posterUrl} 
                alt={media.title || media.name} 
                fill 
                className="object-cover" 
                sizes="(max-width: 640px) 96px, (max-width: 768px) 144px, 200px" 
                priority 
              />
            </div>
          )}
          <div className="space-y-1.8 sm:space-y-3 flex-1 min-w-0 text-left pb-1">
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md font-display uppercase">
              {media.title || media.name}
            </h1>
            
            {/* Metadata tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-300 font-extrabold font-display select-none">
              {(media.release_date || media.first_air_date) && (
                <span className="flex items-center gap-1.2 bg-white/4 border border-white/5 px-2.5 py-0.8 rounded-md uppercase tracking-wider">
                  <CalendarDays className="h-3 w-3 text-primary" />
                  {(media.release_date || media.first_air_date).split("-")[0]}
                </span>
              )}
              {media.runtime > 0 && (
                <span className="flex items-center gap-1.2 bg-white/4 border border-white/5 px-2.5 py-0.8 rounded-md uppercase tracking-wider">
                  <Clock className="h-3 w-3 text-primary" />
                  {Math.floor(media.runtime / 60)}h {media.runtime % 60}m
                </span>
              )}
              {media.episode_run_time?.[0] > 0 && (
                <span className="flex items-center gap-1.2 bg-white/4 border border-white/5 px-2.5 py-0.8 rounded-md uppercase tracking-wider">
                  <Clock className="h-3 w-3 text-primary" />
                  {media.episode_run_time[0]}m
                </span>
              )}
              {creatorName !== "N/A" && (
                <span className="flex items-center gap-1.2 bg-white/4 border border-white/5 px-2.5 py-0.8 rounded-md uppercase tracking-wider">
                  <Clapperboard className="h-3 w-3 text-primary" />
                  {creatorName}
                </span>
              )}
            </div>

            <div className="flex gap-1.2 flex-wrap pt-0.5 select-none font-display">
              {media.genres?.map((g: any) => (
                <span key={g.id} className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-white/3 text-zinc-300 border border-white/5 px-2.5 py-0.8 rounded-md">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="max-w-[1440px] mx-auto px-4 mt-8.5 grid grid-cols-1 lg:grid-cols-3 gap-6.5 md:gap-8.5 relative z-20">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-7">
          
          {/* 2. Ratings and Distribution Block */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Left 3 columns: Ratings Blocks */}
            <div className="md:col-span-3 grid grid-cols-3 gap-3">
              {/* IMDb Block */}
              <div className="cine-glass p-3 rounded-2xl flex flex-col items-center justify-center text-center select-none h-24">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">IMDb</span>
                <p className="text-lg font-black text-white mt-1.5 flex items-center gap-1 font-display">
                  <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400 shrink-0" />
                  {media.vote_average ? media.vote_average.toFixed(1) : "N/A"}
                </p>
              </div>
              {/* Rotten Tomatoes Block */}
              <div className="cine-glass p-3 rounded-2xl flex flex-col items-center justify-center text-center select-none h-24">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest font-display">Tomatometer</span>
                <p className="text-lg font-black text-red-500 mt-1.5 font-display flex items-center gap-1">
                  <svg className="h-4.5 w-4.5 fill-red-500 stroke-none shrink-0" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path d="M428.8 190.4c-9.6-17.6-25.6-32-44.8-41.6-4.8-2.4-8-7.2-8-12.8v-6.4c0-20.8-12-39.2-30.4-47.2-4.8-2-8-6.4-8-11.2V56c0-26.4-21.6-48-48-48h-64c-26.4 0-48 21.6-48 48v15.2c0 4.8-3.2 9.2-8 11.2C153 90.4 141 108.8 141 129.6v6.4c0 5.6-3.2 10.4-8 12.8-19.2 9.6-35.2 24-44.8 41.6-16.8 30.4-16.8 67.2 0 97.6 9.6 17.6 25.6 32 44.8 41.6 4.8 2.4 8 7.2 8 12.8v6.4c0 20.8 12 39.2 30.4 47.2 4.8 2 8 6.4 8 11.2V392c0 26.4 21.6 48 48 48h64c26.4 0 48-21.6 48-48v-15.2c0-4.8 3.2-9.2 8-11.2 18.4-8 30.4-26.4 30.4-47.2v-6.4c0-5.6 3.2-10.4 8-12.8 19.2-9.6 35.2-24 44.8-41.6 16.8-30.4 16.8-67.2 0-97.6z"/>
                  </svg>
                  {media.vote_average ? `${Math.round(media.vote_average * 10 + (media.vote_average > 7 ? 5 : -5))}%` : "N/A"}
                </p>
              </div>
              {/* User Rating Block */}
              <div className="cine-glass p-3 rounded-2xl flex flex-col items-center justify-center text-center select-none h-24 relative group/stars">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Your Rating</span>
                <div className="flex items-center gap-0.5 mt-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const starVal = idx + 1;
                    const isFilled = hoveredStar !== null ? starVal <= hoveredStar : (userRating !== null ? starVal <= userRating : false);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleRate(starVal)}
                        onMouseEnter={() => setHoveredStar(starVal)}
                        onMouseLeave={() => setHoveredStar(null)}
                        className="cursor-pointer hover:scale-115 transition-transform"
                      >
                        <Star className={`h-3.5 w-3.5 transition-colors ${
                          isFilled ? "fill-amber-400 text-amber-400" : "text-zinc-650"
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 2 columns: Rating Distribution Chart */}
            <div className="md:col-span-2 cine-glass p-3 px-4.5 rounded-2xl flex flex-col justify-center select-none h-24">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Rating Distribution</span>
              <div className="space-y-0.8 text-[9px] font-bold text-zinc-400">
                {[
                  { stars: 5, pct: 45 },
                  { stars: 4, pct: 30 },
                  { stars: 3, pct: 15 },
                  { stars: 2, pct: 7 },
                  { stars: 1, pct: 3 },
                ].map((item) => (
                  <div key={item.stars} className="flex items-center gap-2">
                    <span className="w-2">{item.stars}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-[8.5px] font-medium text-zinc-500">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Floating Action Dock */}
          <div className="flex flex-wrap items-center gap-3 bg-[#0A0F1A]/80 backdrop-blur-md p-3 border border-white/5 rounded-2xl shadow-xl justify-around select-none">
            {/* Watch Trailer */}
            {trailerKey ? (
              <button
                onClick={() => {
                  triggerHapticLight();
                  setIsTrailerOpen(true);
                }}
                className="flex items-center justify-center gap-1.8 px-4 py-2.2 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-primary/90 hover:to-rose-600/90 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-102 shrink-0"
              >
                <Play className="h-4.5 w-4.5 fill-white stroke-none" />
                <span>Watch Trailer</span>
              </button>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-1.8 px-4 py-2.2 rounded-xl bg-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider cursor-not-allowed shrink-0"
              >
                <Play className="h-4.5 w-4.5 fill-zinc-600 stroke-none" />
                <span>No Trailer</span>
              </button>
            )}

            {/* Watchlist */}
            <button
              onClick={handleToggleWatchlist}
              disabled={isPending}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0",
                watchStatus === "want_to_watch"
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white/3 border-white/5 text-zinc-350 hover:text-white hover:bg-white/5"
              )}
            >
              {watchStatus === "want_to_watch" ? <Check className="h-4 w-4 stroke-[3]" /> : <Plus className="h-4 w-4" />}
              <span>Watchlist</span>
            </button>

            {/* Favorite */}
            <button
              onClick={handleToggleFavorite}
              disabled={isPending}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0",
                isFavorite
                  ? "bg-pink-500/10 border-pink-500 text-pink-500"
                  : "bg-white/3 border-white/5 text-zinc-350 hover:text-white hover:bg-white/5"
              )}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-pink-500")} />
              <span>Favorite</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2.2 rounded-xl bg-white/3 border border-white/5 text-zinc-350 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>

          {/* 4. Overview Section */}
          <section className="space-y-3 select-none">
            <h2 className="text-xs md:text-sm font-black tracking-widest text-zinc-450 uppercase border-b border-white/5 pb-2.5">
              Overview
            </h2>
            <p className="text-[14.5px] leading-relaxed text-zinc-300 font-medium">
              {media.overview || "No overview available for this title."}
            </p>
          </section>

          {/* 5. Cast Preview (Max 10 avatars, See All) */}
          {cast.length > 0 && (
            <section className="space-y-3.5 select-none">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  <h2 className="text-xs md:text-sm font-black tracking-widest text-zinc-450 uppercase">
                    Cast Members
                  </h2>
                </div>
                {hasMoreCast && (
                  <button
                    onClick={() => { triggerHapticLight(); setShowAllCast(true); }}
                    className="text-[10px] sm:text-xs font-black text-primary hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    See All ({cast.length})
                  </button>
                )}
              </div>

              {/* Horizontal Cast Row */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
                {displayCast.map((actor) => (
                  <div key={actor.id} className="flex flex-col items-center text-center shrink-0 w-16 sm:w-20 snap-start">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border border-white/10 shadow-md bg-white/5 mb-2 shrink-0">
                      {actor.profile_path ? (
                        <SafeImage
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt={actor.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                          fallbackSrc="/placeholder-poster.svg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-black bg-white/5 uppercase">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[10.5px] font-black text-white line-clamp-1 w-full font-display uppercase tracking-wider">
                      {actor.name.split(" ")[0]}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-zinc-500 line-clamp-1 w-full font-bold mt-0.5">
                      {actor.character}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Reviews Preview (2 reviews maximum, See All) */}
          <section className="space-y-4">
            <ReviewsPreviewSection reviews={reviews} mediaId={mediaId} />
            {user && <ReviewForm mediaId={mediaId} mediaType={mediaType} />}
          </section>

          {/* 7. Recommendations Section */}
          <div className="w-full">
            {recommendationsComponent}
          </div>

          {/* Watch Providers Curation */}
          <div className="pt-2">
            {watchProvidersComponent}
          </div>

        </div>

        {/* Right Sidebar Column: Metadata Details */}
        <div className="space-y-4 select-none">
          <div className="cine-glass p-5 rounded-2xl space-y-4 text-xs font-display z-10 relative">
            <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2.5">
              Production Details
            </h4>
            {creatorName !== "N/A" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-white/4 border border-white/5 text-primary shrink-0">
                  <Clapperboard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-black">Director/Creator</p>
                  <p className="font-extrabold text-white text-[12.5px] mt-0.5">{creatorName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-white/4 border border-white/5 text-primary shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-black">Release Status</p>
                <p className="font-extrabold text-white text-[12.5px] mt-0.5">{media.status || "Released"}</p>
              </div>
            </div>
            {media.budget > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-white/4 border border-white/5 text-primary shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-black">Budget</p>
                  <p className="font-extrabold text-white text-[12.5px] mt-0.5">${media.budget?.toLocaleString()}</p>
                </div>
              </div>
            )}
            {media.revenue > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-white/4 border border-white/5 text-primary shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-black">Revenue</p>
                  <p className="font-extrabold text-white text-[12.5px] mt-0.5">${media.revenue?.toLocaleString()}</p>
                </div>
              </div>
            )}
            {media.original_language && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-white/4 border border-white/5 text-primary shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-black">Language</p>
                  <p className="font-extrabold text-white text-[12.5px] mt-0.5 uppercase">{media.original_language}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-[#05070A]/95 border border-white/10 px-5 py-2.5 rounded-full shadow-2xl text-[12.5px] font-black uppercase tracking-wider text-white backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TRAILER MODAL ─── */}
      {trailerKey && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          youtubeKey={trailerKey}
          title={media.title || media.name}
        />
      )}

      {/* ─── FULL CAST DRAWER SHEET ─── */}
      <BottomSheet
        isOpen={showAllCast}
        onClose={() => setShowAllCast(false)}
        title={`Full Cast List (${cast.length})`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
          {cast.map((actor) => (
            <div
              key={`modal-${actor.id}`}
              className="flex items-center gap-3 p-2 rounded-xl bg-white/2 border border-white/3 hover:border-primary/20 transition-all select-none"
            >
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                {actor.profile_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                    alt={actor.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-black bg-white/5 uppercase">
                    {actor.name[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-[11.5px] font-black text-white truncate font-display uppercase tracking-wider">{actor.name}</p>
                <p className="text-[9.5px] text-zinc-500 truncate mt-0.5 font-bold">{actor.character}</p>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

    </div>
  );
}

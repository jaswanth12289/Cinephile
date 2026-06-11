"use client";

import { useState, useTransition, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Heart, 
  Repeat, 
  Bookmark, 
  Star, 
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { reactToActivity, triggerRewatch } from "@/actions/social.actions";
import { setWatchStatus } from "@/actions/tracking.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import dynamic from "next/dynamic";
import { SafeImage } from "./SafeImage";
import { SafeAvatar } from "./SafeAvatar";

/** Inline skeleton shown while the CommentSection module is loading */
function CommentPanelSkeleton() {
  return (
    <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2">
      <div className="flex gap-2">
        <div className="h-7 w-7 rounded-full bg-zinc-800 animate-pulse shrink-0" />
        <div className="flex-1 h-12 rounded-xl bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}

const CommentSection = dynamic(
  () => import("./CommentSection").then((mod) => mod.CommentSection),
  { loading: () => <CommentPanelSkeleton /> }
);

interface FeedCardProps {
  activity: {
    id: string;
    userId: string;
    type: "watched" | "reviewed" | "rewatched" | "finished_series" | "watchlist_added" | "list_created";
    movieId: string | null;
    tvId: string | null;
    rating: number | null;
    reviewText: string | null;
    containsSpoilers: boolean;
    createdAt: Date | any;
    listTitle?: string | null;
    listId?: string | null;
    activitySnapshot?: {
      title: string;
      description: string | null;
      type: "ranking" | "collection" | "watchlist";
      tags: string[];
      posterIds: string[];
      featuredItems: { title: string, posterPath: string | null }[];
      itemsCount: number;
    } | null;
    mediaSnapshot?: {
      id: string;
      title: string;
      posterPath: string | null;
      backdropPath: string | null;
      rating: number;
      releaseYear: string;
      mediaType: "movie" | "tv";
    } | null;
  };
  actor: {
    displayName: string;
    username: string;
    photoURL: string | null;
  };
  initialReactions: Record<string, number>;
  initialUserReaction: string | null;
  initialSaved: boolean;
}

const reactionEmojis: Record<string, string> = {
  love: "❤️",
  peak: "🔥",
  emotional: "😭",
  mindblown: "🤯",
  applause: "👏",
};

const reactionLabels: Record<string, string> = {
  love: "Love",
  peak: "Peak Cinema",
  emotional: "Emotional",
  mindblown: "Mind-blown",
  applause: "Applause",
};

function renderStars(rating: number | null): string {
  if (rating === null || rating === undefined || rating === 0) return "";
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? "½" : "";
  return "★".repeat(fullStars) + halfStar;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

export const FeedCard = memo(function FeedCard({ 
  activity, 
  actor, 
  initialReactions, 
  initialUserReaction,
  initialSaved 
}: FeedCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const router = useRouter();
  
  // Local States
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [userReaction, setUserReaction] = useState<string | null>(initialUserReaction);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  
  const [saved, setSaved] = useState(initialSaved);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const media = activity.mediaSnapshot;
  const isTV = activity.tvId !== null || (media && media.mediaType === "tv");
  const mediaId = activity.movieId || activity.tvId || "";
  const mediaType = isTV ? "tv" : "movie";

  // Format Time
  const dateVal = typeof activity.createdAt === "string"
    ? new Date(activity.createdAt)
    : (activity.createdAt?.toDate 
        ? activity.createdAt.toDate() 
        : (activity.createdAt instanceof Date 
            ? activity.createdAt 
            : (activity.createdAt?._seconds 
                ? new Date(activity.createdAt._seconds * 1000) 
                : new Date())));

  // Action: React (Like)
  const handleReact = (type: "love" | "peak" | "emotional" | "mindblown" | "applause") => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowReactionsPicker(false);

    // Optimistic Update
    const oldType = userReaction;
    setUserReaction(userReaction === type ? null : type);
    setReactions((prev) => {
      const next = { ...prev };
      if (oldType) {
        next[oldType] = Math.max(0, (next[oldType] || 0) - 1);
      }
      if (oldType !== type) {
        next[type] = (next[type] || 0) + 1;
      }
      return next;
    });

    startTransition(async () => {
      try {
        const res = await reactToActivity(activity.id, type);
        if (!res.success) {
          // Rollback on failure
          setUserReaction(oldType);
          setReactions((prev) => {
            const next = { ...prev };
            if (oldType !== type) {
              next[type] = Math.max(0, (next[type] || 0) - 1);
            }
            if (oldType) {
              next[oldType] = (next[oldType] || 0) + 1;
            }
            return next;
          });
        }
      } catch (err) {
        // Rollback on error
        setUserReaction(oldType);
        setReactions((prev) => {
          const next = { ...prev };
          if (oldType !== type) {
            next[type] = Math.max(0, (next[type] || 0) - 1);
          }
          if (oldType) {
            next[oldType] = (next[oldType] || 0) + 1;
          }
          return next;
        });
      }
    });
  };

  // Action: Quick Rewatch
  const handleRewatch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    startTransition(async () => {
      const res = await triggerRewatch(mediaId, mediaType);
      if (res.success) {
        router.refresh();
      }
    });
  };

  // Action: Watchlist Save
  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    const nextState = !saved;
    setSaved(nextState);

    startTransition(async () => {
      await setWatchStatus(mediaId, mediaType, nextState ? "want_to_watch" : null);
    });
  };

  // Resolve list snapshot properties
  const listSnap = activity.activitySnapshot;
  const listTitle = listSnap?.title || activity.listTitle || "Top Curations";
  const listDescription = listSnap?.description || "";
  const listType = listSnap?.type || "collection";
  const listPosterIds = listSnap?.posterIds || [];
  const listItemsCount = listSnap?.itemsCount || 0;

  const totalLikes = Object.values(reactions).reduce((sum, count) => sum + count, 0);

  return (
    <article className="cine-card cine-card-hover p-5 flex gap-4 shadow-md">
      
      <div className="flex-shrink-0 select-none">
        <Link href={`/u/${actor.username}`}>
          <SafeAvatar
            src={actor.photoURL}
            alt={actor.displayName}
            name={actor.displayName}
            size={40}
            className="border-white/5 hover:opacity-85 transition-opacity"
          />
        </Link>
      </div>

      {/* Right Column: Content Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        
        {/* Header Info */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 select-none pb-2">
          <Link href={`/u/${actor.username}`} className="font-bold text-white text-sm hover:underline cursor-pointer">
            {actor.displayName}
          </Link>
          <Link href={`/u/${actor.username}`} className="text-zinc-500 hover:text-zinc-400">
            @{actor.username}
          </Link>
          <span className="text-zinc-700">·</span>
          <span suppressHydrationWarning>{formatRelativeTime(dateVal)}</span>
        </div>

        {/* Action Type / Title Indicator */}
        <div className="text-[10px] text-[#A1A1AA] font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
          {activity.type === "watched" && "Watched"}
          {activity.type === "rewatched" && "Rewatched"}
          {activity.type === "watchlist_added" && "Added to Watchlist"}
          {activity.type === "finished_series" && "Finished Series"}
          {activity.type === "list_created" && "Created List"}
          {activity.type === "reviewed" && "Reviewed"}
        </div>

        {/* Media Block (Poster + Info + Review) */}
        <div className="flex items-start gap-4 mb-3">
          
          {/* Poster: 60x90px */}
          {activity.type === "list_created" && activity.listId ? (
            <Link href={`/u/${actor.username}?tab=lists`} className="flex -space-x-3 shrink-0 select-none">
              {listPosterIds.slice(0, 3).map((path: string, idx: number) => (
                <div 
                  key={`${activity.id}-list-poster-${idx}`} 
                  className="relative h-[90px] w-[60px] rounded bg-[#101018] border border-white/5 shadow-md overflow-hidden"
                  style={{ zIndex: 3 - idx }}
                >
                  <SafeImage
                    src={`https://image.tmdb.org/t/p/w185${path}`}
                    alt="List Poster"
                    fill
                    sizes="60px"
                    className="object-cover"
                    fallbackSrc="/placeholder-poster.svg"
                  />
                </div>
              ))}
              {listPosterIds.length === 0 && (
                <div className="h-[90px] w-[60px] rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-505 font-bold uppercase">
                  Empty
                </div>
              )}
            </Link>
          ) : (
            media && (
              <Link href={`/${media.mediaType}/${media.id}`} className="shrink-0 select-none">
                {media.posterPath ? (
                  <div className="relative h-[90px] w-[60px] rounded-lg overflow-hidden bg-[#101018] border border-white/5 shadow-md">
                    <SafeImage
                      src={`https://image.tmdb.org/t/p/w185${media.posterPath}`}
                      alt={media.title}
                      fill
                      sizes="60px"
                      className="object-cover"
                      fallbackSrc="/placeholder-poster.svg"
                    />
                  </div>
                ) : (
                  <div className="h-[90px] w-[60px] rounded-lg bg-[#101018] border border-white/5 flex items-center justify-center text-[8px] text-zinc-500 font-bold uppercase text-center p-1">
                    No Poster
                  </div>
                )}
              </Link>
            )
          )}

          {/* Media Info + Review Excerpt */}
          <div className="flex-1 min-w-0 space-y-1">
            {activity.type === "list_created" ? (
              <Link href={`/list/${activity.listId}`}>
                <h4 className="text-[14px] font-bold font-display text-white hover:text-primary transition-colors tracking-wide leading-tight truncate">
                  {listTitle}
                </h4>
              </Link>
            ) : (
              media && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 select-none">
                  <Link href={`/${media.mediaType}/${media.id}`} className="text-[14px] font-bold font-display text-white hover:text-primary transition-colors tracking-wide leading-tight">
                    {media.title}
                  </Link>
                  {/* Stars / Ratings */}
                  {(activity.rating || media.rating) && (
                    <span className="text-amber-400 font-extrabold text-[13px] tracking-wide">
                      {renderStars(activity.rating || media.rating)}
                    </span>
                  )}
                </div>
              )
            )}

            {/* Review text with read more */}
            {activity.reviewText ? (
              <div className="text-[13.5px] leading-relaxed text-zinc-300">
                {activity.containsSpoilers && !showSpoiler ? (
                  <div 
                    onClick={() => setShowSpoiler(true)}
                    className="p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="text-amber-500 font-bold text-xs">Contains spoilers. Click to reveal.</span>
                  </div>
                ) : (
                  <div>
                    <p className={cn("break-words whitespace-pre-wrap", !expanded && "line-clamp-3")}>
                      {activity.reviewText}
                    </p>
                    {/* Read More button (only render if text is long enough to clamp) */}
                    {(activity.reviewText.length > 150 || activity.reviewText.includes('\n')) && (
                      <button 
                        onClick={() => setExpanded(!expanded)}
                        className="text-primary hover:underline font-extrabold text-[11px] uppercase mt-1 cursor-pointer block"
                      >
                        {expanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              listDescription && (
                <p className="text-[13px] text-zinc-400 line-clamp-3 leading-relaxed">
                  {listDescription}
                </p>
              )
            )}
          </div>
        </div>

        {/* Reaction badges */}
        {Object.entries(reactions).some(([_, count]) => count > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1.5 pb-2 select-none">
            {Object.entries(reactions)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => {
                const isActive = userReaction === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleReact(type as any)}
                    title={reactionLabels[type]}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all duration-205 cursor-pointer shadow-sm",
                      isActive
                        ? "bg-primary/20 text-primary border-primary/40 scale-105"
                        : "bg-white/5 text-gray-300 border-white/10 hover:border-white/25 hover:bg-white/10"
                    )}
                  >
                    <span>{reactionEmojis[type]}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Actions Toolbar */}
        <div className="flex items-center justify-between text-muted-foreground pt-2 mt-1 border-t border-white/5 relative z-10 select-none">
          
          {/* Reaction / Like Button */}
          <div 
            className="relative"
            onMouseEnter={() => setShowReactionsPicker(true)}
            onMouseLeave={() => setShowReactionsPicker(false)}
          >
            <button
              onClick={() => handleReact("love")}
              aria-label="React to this activity"
              className={cn(
                "flex items-center gap-1.5 hover:text-primary transition-colors py-1 cursor-pointer",
                userReaction && "text-primary"
              )}
            >
              <Heart className={cn("h-4 w-4", userReaction === "love" && "fill-primary text-primary")} />
              <span className="text-[13px] font-bold">
                {totalLikes > 0 ? `${totalLikes} Like${totalLikes !== 1 ? "s" : ""}` : "Like"}
              </span>
            </button>

            {/* Reactions Hover Dialog Panel */}
            <AnimatePresence>
              {showReactionsPicker && (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-full left-0 mb-2 p-1.5 bg-[#101018]/95 backdrop-blur-md border border-white/10 rounded-full shadow-2xl flex items-center gap-2.5 z-50 pointer-events-auto"
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReact(type as any)}
                      title={reactionLabels[type]}
                      className="text-lg hover:scale-125 transition-transform duration-200 p-1 rounded-full hover:bg-white/10 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comment Toggle Trigger */}
          <button
            onClick={() => setIsCommentsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 hover:text-white text-muted-foreground transition-colors py-1 cursor-pointer select-none text-[13px] font-bold"
          >
            <MessageSquare className="h-4 w-4" />
            <span>
              {(activity as any).commentsCount > 0
                ? `${(activity as any).commentsCount} Comments`
                : "Comment"}
            </span>
          </button>

          {/* Rewatch Loop Trigger */}
          {media && activity.type !== "list_created" && (
            <button
              onClick={handleRewatch}
              disabled={isPending}
              title="Quick trigger rewatched activity"
              className="flex items-center gap-1.5 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50"
            >
              <Repeat className="h-4 w-4" />
              <span className="text-[13px] font-bold">Rewatch</span>
            </button>
          )}

          {/* Save Watchlist Toggle */}
          {media && activity.type !== "list_created" && (
            <button
              onClick={handleToggleSave}
              disabled={isPending}
              className={cn(
                "flex items-center gap-1.5 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50",
                saved && "text-primary hover:text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-primary")} />
              <span className="text-[13px] font-bold">{saved ? "Saved" : "Save"}</span>
            </button>
          )}

        </div>

        {/* Lazy-loaded Comment Panel — only mounts when user opens it */}
        {isCommentsOpen && (
          <CommentSection
            targetId={activity.id}
            type="activity"
            initialCommentsCount={(activity as any).commentsCount || 0}
            defaultOpen
          />
        )}

      </div>
    </article>
  );
});

FeedCard.displayName = "FeedCard";

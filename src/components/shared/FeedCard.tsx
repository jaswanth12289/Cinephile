"use client";

import { useState, useTransition, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDensity } from "@/components/providers/DensityProvider";
import { 
  Heart, 
  Repeat, 
  Bookmark, 
  Star, 
  AlertTriangle,
  MessageSquare,
  MoreHorizontal,
  Flag,
  VolumeX,
  ShieldBan,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { reactToActivity, triggerRewatch, toggleSaveActivity, castPollVoteAction } from "@/actions/social.actions";
import { blockUser, muteUser } from "@/actions/user.actions";
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
    type: "watched" | "reviewed" | "rewatched" | "finished_series" | "watchlist_added" | "list_created" | "post";
    movieId: string | null;
    tvId: string | null;
    rating: number | null;
    reviewText: string | null;
    postText?: string | null;
    mentions?: { userId: string; username: string }[];
    hashtags?: string[];
    imageUrls?: string[];
    quoteActivityId?: string | null;
    quoteSnapshot?: any;
    poll?: {
      options: { text: string; voteCount: number }[];
      endsAt: any;
      totalVotes: number;
    } | null;
    clubId?: string | null;
    clubName?: string | null;
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
  isSavedPost?: boolean;
  userPollVote?: number | null;
}

const reactionEmojis: Record<string, string> = {
  love: "❤️",
  peak: "🔥",
  emotional: "😭",
  funny: "😂",
  applause: "👏",
};

const reactionLabels: Record<string, string> = {
  love: "Love",
  peak: "Peak Cinema",
  emotional: "Emotional",
  funny: "Funny",
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

import { ExternalLink, Play } from "lucide-react";

function RichTextPost({ text, mentions, hashtags }: { text: string; mentions?: { userId: string; username: string }[]; hashtags?: string[] }) {
  if (!text) return null;
  const mentionSet = new Set(mentions?.map(m => m.username.toLowerCase()) || []);
  const hashtagSet = new Set(hashtags?.map(h => h.toLowerCase()) || []);

  // Custom parser to handle URLs, Spoilers, Mentions, and Hashtags
  // Regex parts:
  // 1. Spoilers: \|\|(.*?)\|\|
  // 2. URLs: (https?:\/\/[^\s]+)
  // 3. Mentions: (@[\w_]+)
  // 4. Hashtags: (#[\w_]+)
  const parts = text.split(/(\|\|.*?\|\||https?:\/\/[^\s]+|@[\w_]+|#[\w_]+)/g);
  
  let youtubePreview: string | null = null;
  let genericUrl: string | null = null;

  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          if (part.startsWith("||") && part.endsWith("||")) {
            const spoilerContent = part.slice(2, -2);
            return (
              <details key={i} className="inline-block group relative align-middle cursor-pointer">
                <summary className="list-none inline-block px-2 py-0.5 rounded bg-zinc-800 text-transparent select-none transition-colors group-open:bg-transparent group-open:text-zinc-300">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 absolute inset-0 flex items-center justify-center group-open:hidden">Spoiler</span>
                  {spoilerContent}
                </summary>
                <span className="hidden group-open:inline">{spoilerContent}</span>
              </details>
            );
          } else if (part.match(/^https?:\/\//)) {
            // Check for YouTube URL
            const ytMatch = part.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            if (ytMatch && ytMatch[1]) {
              youtubePreview = ytMatch[1];
            } else if (!genericUrl) {
              genericUrl = part;
            }
            try {
              const url = new URL(part);
              return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">{url.hostname}<ExternalLink className="h-3 w-3" /></a>;
            } catch {
              return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">{part}<ExternalLink className="h-3 w-3" /></a>;
            }
          } else if (part.startsWith("@")) {
            const username = part.slice(1);
            if (mentionSet.has(username.toLowerCase())) {
              return <Link key={i} href={`/u/${username}`} className="text-primary hover:underline font-bold">{part}</Link>;
            }
          } else if (part.startsWith("#")) {
            const tag = part.slice(1);
            if (hashtagSet.has(tag.toLowerCase())) {
              return <Link key={i} href={`/tag/${tag}`} className="text-blue-400 hover:underline font-bold">{part}</Link>;
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {/* Render URL Previews */}
      {youtubePreview && (
        <a href={`https://youtube.com/watch?v=${youtubePreview}`} target="_blank" rel="noopener noreferrer" className="block relative aspect-video rounded-xl overflow-hidden border border-white/10 group mt-2 bg-zinc-900 max-w-sm shadow-md">
          <img src={`https://img.youtube.com/vi/${youtubePreview}/hqdefault.jpg`} alt="YouTube Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
            <div className="h-12 w-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-white ml-1 fill-white" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6">
            <p className="text-white text-xs font-bold font-display uppercase tracking-wide">YouTube Video</p>
          </div>
        </a>
      )}
      {!youtubePreview && genericUrl && (
        <a href={genericUrl} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors mt-2 max-w-sm">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-zinc-400" />
            <p className="text-sm font-bold text-white truncate">{new URL(genericUrl).hostname}</p>
          </div>
          <p className="text-xs text-zinc-500 truncate mt-1">{genericUrl}</p>
        </a>
      )}
    </div>
  );
}

export const FeedCard = memo(function FeedCard({ 
  activity, 
  actor, 
  initialReactions, 
  initialUserReaction,
  initialSaved,
  isSavedPost: initialIsSavedPost,
  userPollVote,
}: FeedCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { density } = useDensity();
  const shouldReduceMotion = useReducedMotion();
  const isCompact = density === "compact";
  
  const [reactions, setReactions] = useState(initialReactions);
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [postSaved, setPostSaved] = useState(initialIsSavedPost || false);
  const [expanded, setExpanded] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  
  // Menu
  const [showMenu, setShowMenu] = useState(false);

  // Poll
  const [pollVote, setPollVote] = useState<number | null>(userPollVote ?? null);
  const [isPollLoading, setIsPollLoading] = useState(false);
  const [pollData, setPollData] = useState(activity.poll);

  const [isPending, startTransition] = useTransition();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isReplyingQuote, setIsReplyingQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [isPendingQuote, startQuoteTransition] = useTransition();

  const handleCreateQuote = async () => {
    if (isPendingQuote) return;
    startQuoteTransition(async () => {
      const { createPostAction } = await import("@/actions/social.actions");
      await createPostAction(quoteText, [], [], activity.id);
      setIsReplyingQuote(false);
      setQuoteText("");
    });
  };

  const handleVote = async (index: number) => {
    if (pollVote !== null || isPollLoading || !user) return;
    setIsPollLoading(true);
    
    // optimistic update
    setPollVote(index);
    setPollData(prev => {
      if (!prev) return prev;
      const newOptions = [...prev.options];
      newOptions[index].voteCount += 1;
      return { ...prev, options: newOptions, totalVotes: prev.totalVotes + 1 };
    });

    const { castPollVoteAction } = await import("@/actions/social.actions");
    const res = await castPollVoteAction(activity.id, index);
    if (!res.success) {
      setPollVote(userPollVote ?? null);
      setPollData(activity.poll);
    } else {
        // @ts-expect-error - newPoll is only available on success
        if (res.newPoll) {
          // @ts-expect-error - newPoll is only available on success
          setPollData(res.newPoll);
        }
    }
    setIsPollLoading(false);
  };

  const handleReport = async () => {
    if (!user) return;
    const { reportActivityAction } = await import("@/actions/social.actions");
    await reportActivityAction(activity.id, "Inappropriate content");
    toast.success("Post reported. We will review it shortly.");
    setShowMenu(false);
  };

  const handleMute = async () => {
    if (!user) return;
    await muteUser(activity.userId || actor.username); // actor.username is fallback, but we should use actor ID. Wait, activity.userId is the real actor ID.
    toast.success("User muted. Their posts will be hidden.");
    setShowMenu(false);
    router.refresh();
  };

  const handleBlock = async () => {
    if (!user) return;
    await blockUser(activity.userId || actor.username);
    toast.success("User blocked. They can no longer interact with you.");
    setShowMenu(false);
    router.refresh();
  };

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
  const handleToggleSave = async () => {
    if (isPending) return;
    
    // Optimistic
    setSaved(!saved);
    
    startTransition(async () => {
      const mediaId = activity.movieId || activity.tvId;
      if (!mediaId) return;
      
      const newSavedState = !saved;
      const res = await setWatchStatus(
        mediaId, 
        media?.mediaType || "movie", 
        newSavedState ? "want_to_watch" : null
      );
      if (!res.success) {
        setSaved(saved); // revert
      }
    });
  };

  const handleToggleSavePost = async () => {
    if (isPending) return;
    setPostSaved(!postSaved);
    startTransition(async () => {
      const { toggleSaveActivity } = await import("@/actions/social.actions");
      const res = await toggleSaveActivity(activity.id);
      if (!res.success) {
        setPostSaved(postSaved);
      }
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
    <article className={cn("cine-card cine-card-hover flex shadow-md", isCompact ? "p-2.5 sm:p-3.5 gap-2.5 sm:gap-3" : "p-3.5 sm:p-5 gap-3 sm:gap-4")}>
      
      <div className="flex-shrink-0 select-none">
        <Link href={`/u/${actor.username}`}>
          <SafeAvatar
            src={actor.photoURL}
            alt={actor.displayName}
            name={actor.displayName}
            size={isCompact ? 28 : 36}
            className={cn("border-white/5 hover:opacity-85 transition-opacity", isCompact ? "!h-7 !w-7" : "!h-8 !w-8 sm:!h-10 sm:!w-10")}
          />
        </Link>
      </div>

      {/* Right Column: Content Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        
        {/* Header Info */}
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 select-none pb-2 flex-wrap">
            <Link href={`/u/${actor.username}`} className="font-bold text-white text-sm hover:underline cursor-pointer">
              {actor.displayName}
            </Link>
            <Link href={`/u/${actor.username}`} className="text-zinc-500 hover:text-zinc-400">
              @{actor.username}
            </Link>
            <span className="text-zinc-700">·</span>
            <span suppressHydrationWarning>{formatRelativeTime(dateVal)}</span>
          </div>
          
          <button 
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className="p-1 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-50 w-48 bg-[#101018] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden select-none">
                <button 
                  onClick={handleReport}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Report Post
                </button>
                {user && user.uid !== activity.userId && (
                  <>
                    <button 
                      onClick={handleMute}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-amber-500 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                      Mute User
                    </button>
                    <button 
                      onClick={handleBlock}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <ShieldBan className="h-3.5 w-3.5" />
                      Block User
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Type / Title Indicator */}
        <div className="text-[10px] text-[#A1A1AA] font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
          {activity.type === "watched" && "Watched"}
          {activity.type === "rewatched" && "Rewatched"}
          {activity.type === "watchlist_added" && "Added to Watchlist"}
          {activity.type === "finished_series" && "Finished Series"}
          {activity.type === "list_created" && "Created List"}
          {activity.type === "reviewed" && "Reviewed"}
          {activity.type === "post" && (
            <>
              Thought
              {activity.clubId && activity.clubName && (
                <>
                  <span className="mx-1 text-zinc-600">in</span>
                  <Link href={`/club/${activity.clubId}`} className="text-primary hover:underline">
                    {activity.clubName}
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* Media Block (Poster + Info + Review) */}
        <div className="flex items-start gap-3 sm:gap-4 mb-2.5 sm:mb-3">
          
          {/* Poster: 60x90px (Hidden for "post" type) */}
          {activity.type !== "post" && (
            activity.type === "list_created" && activity.listId ? (
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
                  <div className="h-[90px] w-[60px] rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 font-bold uppercase">
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
            )
          )}

          {/* Media Info + Review Excerpt */}
          <div className="flex-1 min-w-0 space-y-1">
            {activity.type === "post" ? (
              <div className="text-[14.5px] leading-relaxed text-zinc-200 mt-1">
                {activity.postText && (
                  <div className={cn("break-words whitespace-pre-wrap", !expanded && "line-clamp-4")}>
                    <RichTextPost text={activity.postText} mentions={activity.mentions} hashtags={activity.hashtags} />
                  </div>
                )}
                {activity.postText && (activity.postText.length > 200 || activity.postText.includes('\n')) && (
                  <button 
                    onClick={() => setExpanded(!expanded)}
                    className="text-primary hover:underline font-extrabold text-[11px] uppercase mt-1 cursor-pointer block"
                  >
                    {expanded ? "Read less" : "Read more"}
                  </button>
                )}
                
                {/* Quote / Repost Snapshot */}
                {activity.quoteSnapshot && (
                  <div className="mt-3 border border-white/10 rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <SafeAvatar src={activity.quoteSnapshot.photoURL} alt={activity.quoteSnapshot.username} name={activity.quoteSnapshot.displayName} size={20} />
                      <span className="text-[12px] font-bold text-white leading-none">
                        {activity.quoteSnapshot.displayName}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium leading-none">
                        @{activity.quoteSnapshot.username}
                      </span>
                    </div>
                    {activity.quoteSnapshot.postText && (
                      <div className="text-[13px] text-zinc-300 line-clamp-3">
                        <RichTextPost text={activity.quoteSnapshot.postText} />
                      </div>
                    )}
                    {activity.quoteSnapshot.reviewText && (
                      <div className="text-[13px] text-zinc-300 line-clamp-3">
                        {activity.quoteSnapshot.reviewText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activity.type === "list_created" ? (
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
            {activity.type !== "post" && (
              activity.reviewText ? (
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
                      <div className={cn(!expanded && (isCompact ? "line-clamp-2" : "line-clamp-3"))}>
                        <RichTextPost text={activity.reviewText} />
                      </div>
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
              )
            )}

            {/* POST IMAGES GRID */}
            {activity.imageUrls && activity.imageUrls.length > 0 && (
              <div className={cn(
                "mt-3 grid gap-1.5 rounded-xl overflow-hidden max-h-[350px]",
                activity.imageUrls.length === 1 && "grid-cols-1",
                activity.imageUrls.length === 2 && "grid-cols-2 h-[250px]",
                activity.imageUrls.length === 3 && "grid-cols-2 h-[300px]",
                activity.imageUrls.length >= 4 && "grid-cols-2 h-[300px]"
              )}>
                {activity.imageUrls.map((url, idx) => {
                  if (idx > 3) return null; // Max 4 images
                  const len = Math.min(activity.imageUrls!.length, 4);
                  const isThreeFirst = len === 3 && idx === 0;
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "relative bg-[#101018] border border-white/5 cursor-pointer",
                        len === 1 && "aspect-video",
                        len === 2 && "h-full",
                        isThreeFirst && "row-span-2 h-full",
                        len === 3 && !isThreeFirst && "h-[148px]",
                        len === 4 && "h-[148px]"
                      )}
                    >
                      <Image src={url} alt="Post media" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover hover:opacity-95 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* POLL UI */}
            {pollData && (
              <div className="mt-3 bg-black/20 border border-white/5 rounded-xl p-3 select-none">
                <div className="space-y-2">
                  {pollData.options.map((opt, idx) => {
                    const isExpired = new Date() > new Date(pollData.endsAt);
                    const showResults = pollVote !== null || isExpired;
                    const percent = pollData.totalVotes > 0 ? Math.round((opt.voteCount / pollData.totalVotes) * 100) : 0;
                    const isWinner = showResults && opt.voteCount === Math.max(...pollData.options.map(o => o.voteCount)) && opt.voteCount > 0;
                    const isSelected = pollVote === idx;

                    return (
                      <div 
                        key={idx}
                        onClick={() => !showResults && handleVote(idx)}
                        className={cn(
                          "relative rounded-md overflow-hidden min-h-[36px] flex items-center px-3 border border-white/10 transition-colors",
                          !showResults && "hover:bg-white/5 cursor-pointer",
                          showResults && "bg-[#1A1A24]"
                        )}
                      >
                        {showResults && (
                          <div 
                            className={cn(
                              "absolute top-0 left-0 bottom-0 opacity-20",
                              isWinner ? "bg-primary" : "bg-white/40"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        <div className="relative z-10 flex w-full items-center justify-between">
                          <span className={cn("text-[14px] font-bold", isSelected ? "text-primary" : "text-white")}>
                            {opt.text} {isSelected && "✓"}
                          </span>
                          {showResults && (
                            <span className="text-[13px] font-bold text-zinc-400">
                              {percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-zinc-500 font-bold uppercase tracking-wider mt-3 pl-1">
                  <span>{pollData.totalVotes} votes</span>
                  <span>•</span>
                  <span>{new Date() > new Date(pollData.endsAt) ? "Final results" : "Poll active"}</span>
                </div>
              </div>
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
                "flex items-center gap-1 hover:text-primary transition-colors py-1 cursor-pointer",
                userReaction && "text-primary"
              )}
            >
              <Heart className={cn("h-4 w-4", userReaction === "love" && "fill-primary text-primary")} />
              {!isCompact && (
                <>
                  <span className="text-[13px] font-bold hidden md:inline">
                    {totalLikes > 0 ? `${totalLikes} Like${totalLikes !== 1 ? "s" : ""}` : "Like"}
                  </span>
                  {totalLikes > 0 && (
                    <span className="text-[13px] font-bold md:hidden">
                      {totalLikes}
                    </span>
                  )}
                </>
              )}
              {isCompact && totalLikes > 0 && (
                <span className="text-[12px] font-bold">
                  {totalLikes}
                </span>
              )}
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
            aria-label="Toggle comments"
            className="flex items-center gap-1 hover:text-white text-muted-foreground transition-colors py-1 cursor-pointer select-none text-[13px] font-bold"
          >
            <MessageSquare className="h-4 w-4" />
            {!isCompact && (
              <>
                <span className="text-[13px] font-bold hidden md:inline">
                  {(activity as any).commentsCount > 0
                    ? `${(activity as any).commentsCount} Comments`
                    : "Comment"}
                </span>
                {(activity as any).commentsCount > 0 && (
                  <span className="text-[13px] font-bold md:hidden">
                    {(activity as any).commentsCount}
                  </span>
                )}
              </>
            )}
            {isCompact && (activity as any).commentsCount > 0 && (
              <span className="text-[12px] font-bold">
                {(activity as any).commentsCount}
              </span>
            )}
          </button>

          {/* Rewatch Loop Trigger */}
          {media && activity.type !== "list_created" && activity.type !== "post" && (
            <button
              onClick={handleRewatch}
              disabled={isPending}
              aria-label="Quick rewatch activity"
              title="Quick trigger rewatched activity"
              className="flex items-center gap-1 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50 text-[13px] font-bold"
            >
              <Repeat className="h-4 w-4" />
              {!isCompact && <span className="hidden md:inline">Rewatch</span>}
            </button>
          )}

          {/* Repost / Quote Toggle */}
          {activity.type === "post" && (
            <button
              onClick={() => setIsReplyingQuote(!isReplyingQuote)}
              disabled={isPendingQuote}
              aria-label="Repost or Quote"
              title="Repost or Quote Thought"
              className={cn("flex items-center gap-1 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50 text-[13px] font-bold", isReplyingQuote && "text-primary")}
            >
              <Repeat className="h-4 w-4" />
              {!isCompact && <span className="hidden md:inline">Repost</span>}
            </button>
          )}

          {/* Save Watchlist Toggle (Media Only) */}
          {media && activity.type !== "list_created" && activity.type !== "post" && (
            <button
              onClick={handleToggleSave}
              disabled={isPending}
              aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
              className={cn(
                "flex items-center gap-1 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50 text-[13px] font-bold",
                saved && "text-primary hover:text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-primary")} />
              {!isCompact && <span className="hidden md:inline">{saved ? "Saved" : "Save"}</span>}
            </button>
          )}

          {/* Save Post Toggle (Posts, Reviews, Lists) */}
          {(activity.type === "post" || activity.type === "reviewed" || activity.type === "list_created") && (
            <button
              onClick={handleToggleSavePost}
              disabled={isPending}
              aria-label={postSaved ? "Unsave post" : "Save post"}
              className={cn(
                "flex items-center gap-1 hover:text-white transition-colors py-1 cursor-pointer disabled:opacity-50 text-[13px] font-bold",
                postSaved && "text-primary hover:text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", postSaved && "fill-primary")} />
              {!isCompact && <span className="hidden md:inline">{postSaved ? "Saved" : "Save"}</span>}
            </button>
          )}

        </div>

        {/* Repost/Quote Panel */}
        {isReplyingQuote && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Add a thought or leave blank to simple repost..." 
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                disabled={isPendingQuote}
              />
              <button 
                onClick={handleCreateQuote}
                disabled={isPendingQuote}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {quoteText.trim() ? "Quote" : "Repost"}
              </button>
            </div>
          </div>
        )}

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

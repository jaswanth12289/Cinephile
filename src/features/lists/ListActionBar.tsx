"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Heart, Bookmark, GitFork, Share2, 
  Edit3, Loader2, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  likeList, unlikeList, saveList, unsaveList, 
  forkList, incrementListViews, incrementListShares 
} from "@/actions/list.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface ListActionBarProps {
  listId: string;
  ownerId: string;
  collaborators: { uid: string }[];
  initialLikesCount: number;
  initialSavesCount: number;
  initialForksCount: number;
  initialShareCount: number;
  initialIsLiked: boolean;
  initialIsSaved: boolean;
  editUrl: string;
}

export function ListActionBar({
  listId,
  ownerId,
  collaborators,
  initialLikesCount,
  initialSavesCount,
  initialForksCount,
  initialShareCount,
  initialIsLiked,
  initialIsSaved,
  editUrl,
}: ListActionBarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Toolbar States
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  
  const [savesCount, setSavesCount] = useState(initialSavesCount);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  
  const [forksCount, setForksCount] = useState(initialForksCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  
  const [copySuccess, setCopySuccess] = useState(false);
  const [forking, setForking] = useState(false);

  // 1. Throttled View Increment on Page Load
  useEffect(() => {
    const key = `viewed_list_${listId}`;
    const lastViewed = localStorage.getItem(key);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!lastViewed || now - parseInt(lastViewed) > twentyFourHours) {
      incrementListViews(listId).then((res) => {
        if (res.success) {
          localStorage.setItem(key, now.toString());
        }
      });
    }
  }, [listId]);

  // Actions
  const handleLike = () => {
    if (!user) { router.push("/login"); return; }
    
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => nextState ? prev + 1 : Math.max(0, prev - 1));

    startTransition(async () => {
      try {
        const res = nextState ? await likeList(listId) : await unlikeList(listId);
        if (!res.success) {
          setIsLiked(!nextState);
          setLikesCount((prev) => !nextState ? prev + 1 : Math.max(0, prev - 1));
        }
      } catch (err) {
        setIsLiked(!nextState);
        setLikesCount((prev) => !nextState ? prev + 1 : Math.max(0, prev - 1));
      }
    });
  };

  const handleSave = () => {
    if (!user) { router.push("/login"); return; }
    
    const nextState = !isSaved;
    setIsSaved(nextState);
    setSavesCount((prev) => nextState ? prev + 1 : Math.max(0, prev - 1));

    startTransition(async () => {
      try {
        const res = nextState ? await saveList(listId) : await unsaveList(listId);
        if (!res.success) {
          setIsSaved(!nextState);
          setSavesCount((prev) => !nextState ? prev + 1 : Math.max(0, prev - 1));
        }
      } catch (err) {
        setIsSaved(!nextState);
        setSavesCount((prev) => !nextState ? prev + 1 : Math.max(0, prev - 1));
      }
    });
  };

  const handleFork = () => {
    if (!user) { router.push("/login"); return; }
    if (forking) return;

    setForking(true);
    startTransition(async () => {
      const res = await forkList(listId);
      if (res.success && res.slug) {
        setForksCount((prev) => prev + 1);
        router.push(`/list/${res.slug}`);
      } else {
        alert(res.error || "Failed to fork list.");
      }
      setForking(false);
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setShareCount((prev) => prev + 1);
      incrementListShares(listId);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const isOwner = user?.uid === ownerId;
  const isCollab = collaborators.some((c) => c.uid === user?.uid);
  const canEdit = isOwner || isCollab;

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-y border-white/5 select-none">
      
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        className={cn(
          "font-bold uppercase text-[12px] h-9 gap-1.5 px-4 rounded-xl border cursor-pointer transition-all",
          isLiked 
            ? "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/15"
            : "bg-white/5 text-gray-300 border-white/10 hover:border-white/20"
        )}
      >
        <Heart className={cn("h-4 w-4 shrink-0", isLiked && "fill-pink-400")} />
        <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>
      </Button>

      {/* Bookmark / Save Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        className={cn(
          "font-bold uppercase text-[12px] h-9 gap-1.5 px-4 rounded-xl border cursor-pointer transition-all",
          isSaved 
            ? "bg-primary/15 text-primary border-primary/25 hover:bg-primary/20"
            : "bg-white/5 text-gray-300 border-white/10 hover:border-white/20"
        )}
      >
        <Bookmark className={cn("h-4 w-4 shrink-0", isSaved && "fill-primary")} />
        <span>{savesCount} {savesCount === 1 ? "Save" : "Saves"}</span>
      </Button>

      {/* Fork Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFork}
        disabled={forking || isOwner}
        className={cn(
          "font-bold uppercase text-[12px] h-9 gap-1.5 px-4 rounded-xl border bg-white/5 text-gray-300 border-white/10 hover:border-white/20 cursor-pointer transition-all disabled:opacity-50"
        )}
        title={isOwner ? "You own this list" : "Fork this list"}
      >
        {forking ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <GitFork className="h-4 w-4 shrink-0" />
        )}
        <span>{forksCount} {forksCount === 1 ? "Fork" : "Forks"}</span>
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="font-bold uppercase text-[12px] h-9 gap-1.5 px-4 rounded-xl border bg-white/5 text-gray-300 border-white/10 hover:border-white/20 cursor-pointer transition-all"
      >
        {copySuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span>Copied URL!</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 shrink-0" />
            <span>{shareCount} {shareCount === 1 ? "Share" : "Shares"}</span>
          </>
        )}
      </Button>

      {/* Edit List Button */}
      {canEdit && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(editUrl)}
          className="font-black uppercase text-[12px] h-9 gap-1.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer ml-auto transition-all"
        >
          <Edit3 className="h-4 w-4 shrink-0" />
          Edit List
        </Button>
      )}

    </div>
  );
}

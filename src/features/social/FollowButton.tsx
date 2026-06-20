"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/actions/social.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialIsFollowing: boolean;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialIsFollowing,
}: FollowButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  // Don't show button on own profile
  if (user?.uid === targetUserId) return null;

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/login")}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Follow
      </Button>
    );
  }

  const handleToggle = () => {
    const originalValue = isFollowing;
    setIsFollowing(!originalValue);

    startTransition(async () => {
      try {
        const res = originalValue
          ? await unfollowUser(targetUserId, targetUsername)
          : await followUser(targetUserId, targetUsername);
        if (!res.success) {
          setIsFollowing(originalValue);
        }
      } catch (error) {
        setIsFollowing(originalValue);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-label={isFollowing ? "Unfollow user" : "Follow user"}
      onClick={handleToggle}
      className={cn(`group flex items-center justify-center gap-2 min-w-[110px] h-9 rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-wider select-none cursor-pointer border ${
        isFollowing
          ? "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
          : "border-blue-500/40 text-blue-400 bg-transparent hover:bg-blue-500/10 hover:text-blue-300"
      }`)}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
          <span>Follow</span>
        </>
      )}
    </Button>
  );
}

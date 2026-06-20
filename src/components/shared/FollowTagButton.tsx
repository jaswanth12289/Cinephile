"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Hash } from "lucide-react";
import { toggleFollowTag } from "@/actions/user.actions";
import { toast } from "sonner";

interface FollowTagButtonProps {
  tag: string;
  initialIsFollowing: boolean;
}

export function FollowTagButton({ tag, initialIsFollowing }: FollowTagButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (isPending) return;

    // Optimistic update
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    startTransition(async () => {
      const result = await toggleFollowTag(tag);
      if (result.success) {
        toast.success(nextState ? `Following #${tag}` : `Unfollowed #${tag}`);
      } else {
        // Revert on failure
        setIsFollowing(initialIsFollowing);
        toast.error("Failed to update tag follow status");
      }
    });
  };

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size="sm"
      className="font-bold gap-1"
      onClick={handleToggle}
      disabled={isPending}
    >
      <Hash className="h-4 w-4" />
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

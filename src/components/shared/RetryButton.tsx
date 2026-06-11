"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RetryButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

export function RetryButton({ className, variant = "default", size = "default", onClick }: RetryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      if (onClick) {
        onClick();
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={isPending}
      variant={variant}
      size={size}
      className={cn(
        "gap-1.5 cursor-pointer font-extrabold uppercase text-xs h-10 rounded-xl hover:scale-102 transition-transform shadow-lg",
        className
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
      {isPending ? "Retrying..." : "Try Again"}
    </Button>
  );
}

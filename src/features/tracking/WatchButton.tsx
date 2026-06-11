"use client";

import { useState, useTransition } from "react";
import { setWatchStatus } from "@/actions/tracking.actions";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Clock,
  Bookmark,
  XCircle,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WatchStatus = "watched" | "watching" | "want_to_watch" | "dropped";

interface WatchButtonProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  initialStatus: WatchStatus | null;
}

const statusConfig: Record<
  WatchStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  watched: {
    label: "Watched",
    icon: CheckCircle2,
    color: "text-green-400 bg-green-400/10 border-green-400/30",
  },
  watching: {
    label: "Watching",
    icon: Eye,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  },
  want_to_watch: {
    label: "Want to Watch",
    icon: Bookmark,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  dropped: {
    label: "Dropped",
    icon: XCircle,
    color: "text-muted-foreground bg-muted border-border",
  },
};

export function WatchButton({ mediaId, mediaType, initialStatus }: WatchButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<WatchStatus | null>(initialStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!user) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        <Bookmark className="mr-2 h-4 w-4" />
        Sign in to track
      </Button>
    );
  }

  const current = status ? statusConfig[status] : null;

  const handleSelect = (newStatus: WatchStatus | null) => {
    setOpen(false);
    startTransition(async () => {
      setStatus(newStatus);
      await setWatchStatus(mediaId, mediaType, newStatus);
    });
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
          current
            ? current.color
            : "bg-primary text-primary-foreground border-transparent hover:bg-primary/80"
        )}
      >
        <span className="flex items-center gap-2">
          {current ? (
            <current.icon className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {current ? current.label : "Add to List"}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-2xl z-50 overflow-hidden">
          {(Object.entries(statusConfig) as [WatchStatus, typeof statusConfig[WatchStatus]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary",
                  status === key ? "text-primary font-semibold" : "text-foreground"
                )}
              >
                <cfg.icon className="h-4 w-4" />
                {cfg.label}
              </button>
            )
          )}
          {status && (
            <>
              <div className="h-px bg-border" />
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Remove from list
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

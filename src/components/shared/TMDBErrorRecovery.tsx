"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TMDBErrorRecoveryProps {
  title?: string;
  onRetry?: () => void;
}

export function TMDBErrorRecovery({ title = "Content", onRetry }: TMDBErrorRecoveryProps) {
  const router = useRouter();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      router.refresh();
    }
  };

  return (
    <div className="w-full p-6 rounded-2xl border border-white/5 bg-[#101018]/45 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 shadow-lg select-none my-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
        <AlertTriangle className="h-5 w-5" />
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-black text-white uppercase tracking-wide">
          TMDB temporarily unavailable
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          We're having trouble loading {title.toLowerCase()}. Please check your connection or try again.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="gap-1.5 font-bold border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
        <Link href="/" className="inline-block">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-bold border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <Home className="h-3.5 w-3.5" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

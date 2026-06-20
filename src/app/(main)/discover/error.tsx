"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { RetryButton } from "@/components/shared/RetryButton";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent("route_error", {
      message: error?.message || "Unknown discover error",
      stack: error?.stack,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center select-none space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner animate-pulse">
        <AlertCircle className="h-6 w-6" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-[20px] font-black text-white uppercase tracking-wider font-display">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed font-medium">
          Cinephile encountered an error while loading this content. Please try again or head back to safety.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 select-none">
        <RetryButton
          onClick={reset}
          className="px-6 shadow-primary/10"
        />
        <Link href="/" prefetch={true}>
          <Button
            variant="outline"
            className="font-extrabold uppercase text-xs h-10 px-6 rounded-xl border border-white/10 hover:bg-white/5 gap-1.5 cursor-pointer hover:scale-102 transition-transform text-zinc-300"
          >
            <Home className="h-3.5 w-3.5" />
            Back Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

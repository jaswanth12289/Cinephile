"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route-level uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center p-4 text-white select-none">
      <div className="max-w-md w-full bg-card/25 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
          <AlertTriangle className="h-7 w-7" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-wide">
            Cinephile encountered an error
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            We had trouble loading this section. This could be due to a temporary TMDB connection drop or Firestore rules timeout.
          </p>
          {error.message && (
            <pre className="text-[11px] text-red-400 bg-black/45 p-3 rounded-xl max-w-full overflow-x-auto select-text font-mono text-left whitespace-pre-wrap break-all mt-2 border border-white/5">
              {error.message.includes("FirebaseError") || error.message.includes("FAILED_PRECONDITION") || error.message.includes("index")
                ? "We're still preparing this section. Please try again in a moment."
                : error.message}
            </pre>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/feed"}
            className="flex-1 font-extrabold uppercase text-xs h-10 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer"
          >
            Back to Feed
          </Button>
          <Button
            onClick={() => reset()}
            className="flex-1 font-extrabold uppercase text-xs h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/15 cursor-pointer"
          >
            Retry Page
          </Button>
        </div>
      </div>
    </div>
  );
}

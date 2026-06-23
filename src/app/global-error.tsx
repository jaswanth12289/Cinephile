// @ts-nocheck
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent("route_error", {
      message: error?.message || "Unknown global error",
      stack: error?.stack,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center p-4 text-white select-none">
          <div className="max-w-md w-full bg-card/25 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-wide">
                Fatal App Error
              </h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Cinephile encountered a critical error. We apologize for the interruption.
              </p>
              {error.message && (
                <pre className="text-[11px] text-red-400 bg-black/45 p-3 rounded-xl max-w-full overflow-x-auto select-text font-mono text-left whitespace-pre-wrap break-all mt-2 border border-white/5">
                  {error.message}
                </pre>
              )}
            </div>

            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 font-extrabold uppercase text-xs h-10 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer bg-transparent transition-colors flex items-center justify-center"
              >
                Back Home
              </button>
              <button
                onClick={() => reset()}
                className="flex-1 font-extrabold uppercase text-xs h-10 rounded-xl border border-transparent bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

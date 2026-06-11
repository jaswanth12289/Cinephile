"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectionErrorBanner() {
  useEffect(() => {
    console.warn("[TMDB API Error] Page-level connection failed. Unable to load content sections from TMDB services.");
  }, []);

  const handleRetry = () => {
    console.log("[TMDB API] Retrying page-level data fetch...");
    window.location.reload();
  };

  return (
    <div className="w-full p-4 rounded-xl border border-primary/20 bg-primary/5 text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
      <div className="space-y-1">
        <h3 className="font-extrabold text-sm flex items-center gap-2 text-white">
          <AlertTriangle className="h-4 w-4 text-primary animate-pulse" />
          Unable to load content from TMDB.
        </h3>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Cinephile cannot establish a connection to TMDB services. Please check your network connection, verify your TMDB credentials configurations, and click retry to reload.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        className="self-start sm:self-center border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:text-white font-bold"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        Retry Connection
      </Button>
    </div>
  );
}

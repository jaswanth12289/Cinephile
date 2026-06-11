"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Sync initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full bg-[#E94560] text-white py-2 px-4 text-center text-xs font-bold font-display select-none flex items-center justify-center gap-2 z-50 sticky top-0 shadow-lg border-b border-white/10 transition-all duration-300">
      <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
      <span>No internet connection. Some content may not load.</span>
    </div>
  );
}

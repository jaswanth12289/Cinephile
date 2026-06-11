"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { History, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TRENDING_SEARCHES = ["Interstellar", "Oppenheimer", "Dune", "RRR", "Severance"];

export function RecentAndTrendingSearches() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recents, setRecents] = useState<string[]>([]);

  const loadRecents = () => {
    if (typeof window !== "undefined") {
      try {
        const items = JSON.parse(localStorage.getItem("cinephile_recent_searches") || "[]");
        setRecents(items);
      } catch (e) {
        console.warn("Failed to parse recent searches:", e);
      }
    }
  };

  useEffect(() => {
    loadRecents();
    window.addEventListener("cinephile_recent_searches_updated", loadRecents);
    return () => {
      window.removeEventListener("cinephile_recent_searches_updated", loadRecents);
    };
  }, []);

  const handleSelect = (query: string) => {
    router.replace(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.removeItem("cinephile_recent_searches");
      setRecents([]);
    }
  };

  const handleRemoveItem = (e: React.MouseEvent, item: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const updated = recents.filter((r) => r !== item);
      localStorage.setItem("cinephile_recent_searches", JSON.stringify(updated));
      setRecents(updated);
    }
  };

  return (
    <div className="space-y-5 select-none font-display">
      {/* Recent Searches */}
      {recents.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Recent Searches
            </span>
            <button
              onClick={handleClear}
              className="text-[10px] text-zinc-400 hover:text-primary hover:underline transition-colors uppercase tracking-wider cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recents.map((item) => (
              <div
                key={item}
                onClick={() => handleSelect(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-white/5 bg-white/3 text-zinc-300 hover:text-white hover:bg-white/8 hover:border-white/15 cursor-pointer transition-all shadow-sm"
              >
                <span>{item}</span>
                <button
                  onClick={(e) => handleRemoveItem(e, item)}
                  className="p-0.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  title="Remove from recents"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      <div className="space-y-2.5">
        <div className="flex items-center text-zinc-500 text-[11px] font-black uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary animate-pulse" /> Trending Searches
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map((item) => (
            <button
              key={item}
              onClick={() => handleSelect(item)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-white/5 bg-white/3 text-zinc-300 hover:text-white hover:bg-white/8 hover:border-white/15 cursor-pointer transition-all shadow-sm"
            >
              🔥 {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

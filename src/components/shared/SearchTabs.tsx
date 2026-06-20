"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { triggerHapticLight } from "@/lib/native/haptics";

interface SearchTabsProps {
  activeTab: string;
  query: string;
  movieCount: number | null;
  tvCount: number | null;
  personCount: number | null;
  userCount: number | null;
  postCount: number | null;
  hashtagCount: number | null;
}

export function SearchTabs({
  activeTab,
  query,
  movieCount,
  tvCount,
  personCount,
  userCount,
  postCount,
  hashtagCount,
}: SearchTabsProps) {
  const tabs = [
    { id: "movies", label: "Movies", count: movieCount },
    { id: "tv", label: "TV Shows", count: tvCount },
    { id: "people", label: "People", count: personCount },
    { id: "users", label: "Users", count: userCount },
    { id: "posts", label: "Posts", count: postCount },
    { id: "hashtags", label: "Hashtags", count: hashtagCount },
  ];

  return (
    <div className="flex items-center border-b border-white/5 pb-1 gap-1.5 select-none overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/search?q=${encodeURIComponent(query)}&t=${tab.id}`}
            onClick={() => {
              triggerHapticLight();
            }}
            className={cn(
              "px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer whitespace-nowrap",
              isActive
                ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                : "bg-white/5 text-gray-400 border-white/5 hover:border-white/10 hover:text-white"
            )}
          >
            {tab.label} {tab.count !== null ? `(${tab.count})` : ""}
          </Link>
        );
      })}
    </div>
  );
}

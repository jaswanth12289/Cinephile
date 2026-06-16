"use client";

import Link from "next/link";
import { triggerHapticLight } from "@/lib/native/haptics";

interface ProfileTabsProps {
  tab: string;
  username: string;
}

export function ProfileTabs({ tab, username }: ProfileTabsProps) {
  const tabs = ["activity", "reviews", "lists", "watchlist", "favorites"];

  return (
    <div className="flex border-b border-white/5 mt-6 select-none overflow-x-auto scrollbar-none font-display">
      {tabs.map((t) => {
        const isActive = tab === t;
        return (
          <Link
            key={t}
            href={`/u/${username}?tab=${t}`}
            scroll={false}
            onClick={() => {
              triggerHapticLight();
            }}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              isActive
                ? "border-[#E94560] text-white"
                : "border-transparent text-[#A1A1AA] hover:text-white"
            }`}
          >
            {t}
          </Link>
        );
      })}
    </div>
  );
}

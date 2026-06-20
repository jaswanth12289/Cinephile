"use client";

import { useEffect, useState } from "react";
import { getTrendingHashtags } from "@/actions/trending.actions";
import Link from "next/link";
import { Hash, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendingTopics({ className }: { className?: string }) {
  const [topics, setTopics] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrendingHashtags().then((data) => {
      setTopics(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className={cn("cine-card p-5 animate-pulse min-h-[160px]", className)}>
        <div className="h-6 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-48 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) return null;

  return (
    <div className={cn("cine-card p-5 border border-white/5 bg-[#101018]", className)}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black text-white uppercase tracking-wider font-display">Trending Topics</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((t, idx) => (
          <Link
            key={t.tag}
            href={`/tag/${t.tag}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/50 transition-colors group"
          >
            <Hash className="h-3.5 w-3.5 text-zinc-400 group-hover:text-primary transition-colors" />
            <span className="text-[13px] font-bold text-white leading-none">{t.tag}</span>
            <span className="text-[10px] text-zinc-500 font-medium ml-1">{t.count} posts</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

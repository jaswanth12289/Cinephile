"use client";

import { useState } from "react";
import Link from "next/link";
import { ListCoverCollage } from "@/components/shared/ListCoverCollage";
import { Heart, MessageSquare, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListCardsSectionProps {
  lists: any[];
  title: string;
  icon: React.ReactNode;
}

export function ListCardsSection({ lists, title, icon }: ListCardsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleLists = expanded ? lists : lists.slice(0, 4);
  const hasMore = lists.length > 4;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1 border-b border-white/5 select-none">
        <div className="[&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:text-primary">{icon}</div>
        <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
          {title}
        </h2>
      </div>

      {/* List cards stack */}
      <div className="space-y-3">
        {visibleLists.map((list) => {
          const posterPaths = list.featuredItems?.map((i: any) => i.posterPath).filter(Boolean) || [];
          return (
            <div 
              key={list.id} 
              className="cine-card cine-card-hover p-2 flex gap-3 h-[100px] sm:h-[110px] items-center overflow-hidden shadow-md"
            >
              {/* Cover Collage Thumbnail - Spotify-style compact grid */}
              <Link 
                href={`/list/${list.slug}`} 
                className="h-20 sm:h-24 aspect-[4/3] shrink-0 hover:opacity-85 transition-opacity"
              >
                <ListCoverCollage posterPaths={posterPaths} className="rounded-xl" />
              </Link>

              {/* Text details */}
              <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center select-none">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/list/${list.slug}`}>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-white hover:text-primary tracking-wide transition-colors line-clamp-1 font-display">
                      {list.title}
                    </h3>
                  </Link>
                  <span className="text-[9px] font-black uppercase bg-primary/10 border border-primary/25 text-primary px-1.5 py-0.5 rounded-md shrink-0">
                    {list.type}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-semibold mt-0.5">
                  <span>by <Link href={`/user/${list.ownerUsername}`} className="text-gray-300 hover:text-primary transition-colors hover:underline">@{list.ownerUsername}</Link></span>
                  <span>•</span>
                  <span className="text-gray-300 font-bold">{list.itemsCount} {list.itemsCount === 1 ? "film" : "films"}</span>
                </div>

                {/* Secondary Row for likes/comments/views */}
                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground mt-1.5 select-none">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-gray-500/10 text-pink-500/80" />
                    {list.likesCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-green-500/80" />
                    {list.commentsCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-blue-500/80" />
                    {list.viewsCount || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* See More Lists Trigger */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] sm:text-xs font-black text-primary hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            {expanded ? (
              <>
                See Less Lists <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                See More Lists →
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

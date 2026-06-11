"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X, Pencil, Loader2 } from "lucide-react";
import { pinFavorite } from "@/actions/user.actions";
import dynamic from "next/dynamic";
const FavoritesSearchModal = dynamic(() => import("./FavoritesSearchModal").then((mod) => mod.FavoritesSearchModal), {
  ssr: false
});
import Image from "next/image";
import { useRouter } from "next/navigation";

interface FavoriteItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
}

interface FavoritesGridProps {
  initialFavorites: (FavoriteItem | null)[];
  isOwnProfile: boolean;
}

export function FavoritesGrid({
  initialFavorites,
  isOwnProfile,
}: FavoritesGridProps) {
  const router = useRouter();
  
  // Local slots state
  const [favorites, setFavorites] = useState<(FavoriteItem | null)[]>(() => {
    const arr = [...initialFavorites];
    while (arr.length < 4) {
      arr.push(null);
    }
    return arr.slice(0, 4);
  });

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Action: Add / Replace Favorite Selection
  const handleSelectMedia = (item: FavoriteItem) => {
    if (activeSlot === null) return;
    const slotIdx = activeSlot;

    // Optimistic Update
    setFavorites((prev) => {
      const next = [...prev];
      next[slotIdx] = item;
      return next;
    });

    startTransition(async () => {
      const res = await pinFavorite(slotIdx, item);
      if (res.success) {
        router.refresh();
      }
    });
  };

  // Action: Clear/Delete Favorite
  const handleClearSlot = (e: React.MouseEvent, slotIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic Update
    setFavorites((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });

    startTransition(async () => {
      const res = await pinFavorite(slotIdx, null);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const openSearchForSlot = (slotIdx: number) => {
    setActiveSlot(slotIdx);
    setSearchOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {favorites.map((item, idx) => {
          const isEmpty = item === null;

          if (isEmpty) {
            return (
              <div key={idx} className="relative aspect-[2/3] w-full rounded-xl overflow-hidden select-none">
                {isOwnProfile ? (
                  <button
                    onClick={() => openSearchForSlot(idx)}
                    disabled={isPending}
                    className="w-full h-full border border-dashed border-white/20 hover:border-primary/50 bg-white/5 hover:bg-primary/5 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all gap-2 cursor-pointer group"
                  >
                    {isPending && activeSlot === idx ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add slot {idx + 1}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full h-full border border-dashed border-white/10 bg-white/2 flex items-center justify-center text-muted-foreground/30 text-xs font-semibold uppercase tracking-wider">
                    Empty slot
                  </div>
                )}
              </div>
            );
          }

          const detailsUrl = `/${item!.mediaType}/${item!.tmdbId}`;

          return (
            <div
              key={idx}
              className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/10 group bg-card shadow-lg select-none"
            >
              {/* Media Poster */}
              {item!.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${item!.posterPath}`}
                  alt={item!.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover group-hover:scale-103 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3 text-center bg-white/5 text-gray-400 text-xs font-bold">
                  {item!.title}
                </div>
              )}

              {/* Edit Overlay (for owners) */}
              {isOwnProfile && (
                <>
                  {/* Delete Badge Button */}
                  <button
                    onClick={(e) => handleClearSlot(e, idx)}
                    disabled={isPending}
                    title="Remove favorite"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-destructive text-white hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-md"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Replace Button Overlay */}
                  <button
                    onClick={() => openSearchForSlot(idx)}
                    disabled={isPending}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer text-white"
                  >
                    {isPending && activeSlot === idx ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Pencil className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Replace</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Standard clickable card overlay for visitors */}
              {!isOwnProfile && (
                <Link href={detailsUrl} className="absolute inset-0 z-10" />
              )}
            </div>
          );
        })}
      </div>

      {/* TMDB Search selection popup */}
      <FavoritesSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSelectMedia}
      />
    </>
  );
}

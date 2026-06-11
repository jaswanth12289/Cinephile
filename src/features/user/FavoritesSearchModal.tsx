"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { searchTMDBSocial } from "@/actions/user.actions";
import { Search, X, Loader2, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FavoritesSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    year: string;
  }) => void;
}

export function FavoritesSearchModal({
  isOpen,
  onClose,
  onSelect,
}: FavoritesSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const searchRes = await searchTMDBSocial(query);
        const filtered = searchRes.filter(
          (item: any) => item.media_type === "movie" || item.media_type === "tv"
        );
        setResults(filtered);
      } catch (err) {
        console.warn("Search error in modal:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#12121E] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 select-none">
              <h3 className="text-[16px] font-bold text-white uppercase tracking-wider">
                Select Favorite Title
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-white/5 bg-black/15">
              <div className="relative flex items-center">
                <Search className="h-5 w-5 text-muted-foreground absolute left-3" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search movies or TV shows..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-input/10 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary h-auto transition-all"
                />
              </div>
            </div>

            {/* Results Shelf */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs gap-2 select-none">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Searching database...
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center select-none p-4">
                  <Film className="h-8 w-8 text-white/10 mb-2" />
                  <p className="text-[13px] font-semibold text-gray-400">
                    {query ? `No results matching "${query}"` : "Search to select favorite"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Type a title above to discover and pin it.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((item) => {
                    const title = item.title || item.name;
                    const date = item.release_date || item.first_air_date || "";
                    const year = date ? date.split("-")[0] : "";
                    const mediaType = item.media_type;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelect({
                            tmdbId: item.id,
                            mediaType: mediaType as "movie" | "tv",
                            title,
                            posterPath: item.poster_path || null,
                            backdropPath: item.backdrop_path || null,
                            year,
                          });
                          onClose();
                        }}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        {item.poster_path ? (
                          <div className="relative h-12 w-8 shrink-0 rounded overflow-hidden bg-muted border border-white/5">
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                              alt={title}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase">
                            No Poster
                          </div>
                        )}
                        <div className="min-w-0 select-none">
                          <h4 className="text-[13.5px] font-bold text-white group-hover:text-primary transition-colors truncate">
                            {title}
                          </h4>
                          <p className="text-[12px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                            {year && <span>{year}</span>}
                            {year && <span className="text-gray-600">·</span>}
                            <span className="text-[10px] uppercase font-black tracking-wider bg-white/5 px-1 rounded-sm">
                              {mediaType}
                            </span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

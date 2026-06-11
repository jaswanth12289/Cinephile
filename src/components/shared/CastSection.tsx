"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import { SafeImage } from "./SafeImage";
import { AnimatePresence, motion } from "framer-motion";

interface Actor {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CastSectionProps {
  cast: Actor[];
}

export function CastSection({ cast }: CastSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const displayCast = cast.slice(0, 10);
  const hasMore = cast.length > 10;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 select-none">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            Cast Members
          </h2>
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] sm:text-xs font-extrabold text-primary hover:underline uppercase tracking-wider cursor-pointer"
          >
            See All Cast
          </button>
        )}
      </div>

      {/* Horizontal Scroll List */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x select-none">
        {displayCast.map((actor) => (
          <div key={actor.id} className="flex flex-col items-center text-center shrink-0 w-16 sm:w-20 snap-start">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border border-white/10 shadow-md bg-white/5 mb-1.5 shrink-0">
              {actor.profile_path ? (
                <SafeImage
                  src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                  alt={actor.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 56px, 64px"
                  fallbackSrc="/placeholder-poster.svg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-black bg-white/5 uppercase font-display">
                  {actor.name[0]}
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-[10.5px] font-bold text-white line-clamp-1 w-full font-display">
              {actor.name}
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] text-[#A1A1AA] line-clamp-1 w-full font-medium">
              {actor.character}
            </span>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="flex flex-col items-center justify-center shrink-0 w-16 sm:w-20 snap-start cursor-pointer group"
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/3 hover:bg-white/5 hover:border-primary/50 transition-all mb-1.5 shrink-0">
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 group-hover:text-primary transition-colors">
                + {cast.length - 10}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-zinc-400 group-hover:text-primary transition-colors uppercase tracking-wider">
              More
            </span>
          </button>
        )}
      </div>

      {/* Modern Overlay Modal for Full Cast */}
      <AnimatePresence>
        {showAll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAll(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-[#09090F] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 select-none">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-black uppercase tracking-wider text-white font-display">
                    Full Cast Members ({cast.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowAll(false)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scrollable Grid */}
              <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 scrollbar-hide">
                {cast.map((actor) => (
                  <div
                    key={`modal-${actor.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl bg-white/2 border border-white/3 hover:border-primary/30 transition-colors"
                  >
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                      {actor.profile_path ? (
                        <SafeImage
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt={actor.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          fallbackSrc="/placeholder-poster.svg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-black bg-white/5 uppercase font-display">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[11px] font-bold text-white truncate font-display">{actor.name}</p>
                      <p className="text-[9.5px] text-[#A1A1AA] truncate mt-0.5 font-medium">{actor.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

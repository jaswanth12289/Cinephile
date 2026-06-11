"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";

interface ListCoverCollageProps {
  posterPaths: string[];
  className?: string;
}

export function ListCoverCollage({ posterPaths, className }: ListCoverCollageProps) {
  const paths = posterPaths.filter(Boolean);
  const count = paths.length;

  if (count === 0) {
    return (
      <div 
        className={cn(
          "w-full h-full aspect-[4/3] bg-white/5 border border-[var(--cine-border)] rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-[10px] font-black uppercase tracking-wider select-none", 
          className
        )}
      >
        <span>No Films</span>
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "w-full h-full aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--cine-border)] shadow-2xl relative select-none bg-[var(--cine-bg)] cursor-pointer", 
        className
      )}
    >
      {count === 1 && (
        <div className="relative w-full h-full">
          <Image
            src={`https://image.tmdb.org/t/p/w500${paths[0]}`}
            alt="List Cover"
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover"
          />
        </div>
      )}
      {count === 2 && (
        <div className="grid grid-cols-2 h-full w-full gap-[2px] bg-black">
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[0]}`}
              alt="List Cover 1"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[1]}`}
              alt="List Cover 2"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
        </div>
      )}
      {count === 3 && (
        <div className="grid grid-cols-2 h-full w-full gap-[2px] bg-black">
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w500${paths[0]}`}
              alt="List Cover 1"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
          <div className="grid grid-rows-2 h-full w-full gap-[2px]">
            <div className="relative w-full h-full">
              <Image
                src={`https://image.tmdb.org/t/p/w342${paths[1]}`}
                alt="List Cover 2"
                fill
                sizes="(max-width: 768px) 25vw, 125px"
                className="object-cover"
              />
            </div>
            <div className="relative w-full h-full">
              <Image
                src={`https://image.tmdb.org/t/p/w342${paths[2]}`}
                alt="List Cover 3"
                fill
                sizes="(max-width: 768px) 25vw, 125px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      )}
      {count >= 4 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-[2px] bg-black">
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[0]}`}
              alt="List Cover 1"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[1]}`}
              alt="List Cover 2"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[2]}`}
              alt="List Cover 3"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
          <div className="relative w-full h-full">
            <Image
              src={`https://image.tmdb.org/t/p/w342${paths[3]}`}
              alt="List Cover 4"
              fill
              sizes="(max-width: 768px) 50vw, 250px"
              className="object-cover"
            />
          </div>
        </div>
      )}
      {/* Overlay vignette/gradient to blend grid edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none" />
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import dynamic from "next/dynamic";
const TrailerModal = dynamic(() => import("./TrailerModal").then((mod) => mod.TrailerModal), {
  ssr: false
});
import { cn } from "@/lib/utils";

interface TrailerSectionProps {
  youtubeKey: string;
  title: string;
  backdropPath: string | null;
}

export function TrailerSection({ youtubeKey, title, backdropPath }: TrailerSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const previewUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w780${backdropPath}`
    : null;

  return (
    <div className="space-y-3">
      <h2 className="text-[24px] font-black tracking-tight text-white uppercase">
        Trailer
      </h2>
      
      {previewUrl ? (
        <div 
          onClick={() => setIsOpen(true)}
          className="relative aspect-video w-full max-w-md rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-pointer group bg-black"
        >
          {/* Backdrop Image with Hover Effect */}
          <Image 
            src={previewUrl}
            alt={`${title} Trailer Preview`}
            fill
            className="object-cover opacity-60 group-hover:scale-105 group-hover:opacity-40 transition-all duration-500"
            sizes="(max-width: 768px) 100vw, 400px"
          />

          {/* Hover Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

          {/* Floating Play Button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-primary transition-all duration-300 ring-4 ring-primary/20">
              <Play className="h-6 w-6 fill-current ml-0.5" />
            </div>
            <span className="text-[13px] font-black text-white uppercase tracking-widest drop-shadow-md select-none group-hover:text-primary transition-colors duration-200">
              Play Trailer
            </span>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center aspect-video w-full max-w-md rounded-2xl border border-dashed border-white/20 bg-card/40 hover:bg-card/70 hover:border-primary/50 transition-all duration-300 cursor-pointer p-6 text-center group"
        >
          <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-primary group-hover:border-primary/30 transition-colors mb-2">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </div>
          <p className="text-[14px] font-black text-white">Play Video</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">Official TMDB video source</p>
        </div>
      )}

      {/* Trailer Overlay Modal */}
      <TrailerModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        youtubeKey={youtubeKey}
        title={title}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Film } from "lucide-react";
import dynamic from "next/dynamic";
import { BottomSheet } from "./BottomSheet";
import { ExpandableSection } from "./ExpandableSection";

const TrailerModal = dynamic(() => import("./TrailerModal").then((mod) => mod.TrailerModal), {
  ssr: false
});

interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface VideosSectionProps {
  videos: Video[];
  title: string;
  backdropPath: string | null;
}

export function VideosSection({ videos = [], title, backdropPath }: VideosSectionProps) {
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!videos || videos.length === 0) return null;

  // Find the primary trailer, or fallback to the first video
  const mainVideo = videos.find((v) => v.type === "Trailer" && v.site === "YouTube") || videos[0];
  const otherVideos = videos.filter((v) => v.id !== mainVideo.id && v.site === "YouTube");
  const hasMore = otherVideos.length > 0;

  const previewUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w780${backdropPath}`
    : null;

  return (
    <>
      <ExpandableSection
        title="Trailers & Videos"
        icon={Film}
        actionLabel={hasMore ? `+ ${otherVideos.length} More Videos` : undefined}
        onActionClick={hasMore ? () => setIsSheetOpen(true) : undefined}
      >
        {previewUrl ? (
          <div 
            onClick={() => setActiveVideoKey(mainVideo.key)}
            className="relative aspect-video w-full max-w-md rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-pointer group bg-black"
          >
            {/* Backdrop Image with Hover Effect */}
            <Image 
              src={previewUrl}
              alt={`${title} Video Preview`}
              fill
              className="object-cover opacity-60 group-hover:scale-[1.02] group-hover:opacity-45 transition-all duration-500"
              sizes="(max-width: 768px) 100vw, 400px"
            />

            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

            {/* Floating Play Button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-primary transition-all duration-300 ring-4 ring-primary/20">
                <Play className="h-6 w-6 fill-current ml-0.5" />
              </div>
              <span className="text-[12px] font-black text-white uppercase tracking-widest drop-shadow-md select-none group-hover:text-primary transition-colors duration-200 text-center px-4 line-clamp-1">
                Play {mainVideo.type}: {mainVideo.name}
              </span>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setActiveVideoKey(mainVideo.key)}
            className="flex flex-col items-center justify-center aspect-video w-full max-w-md rounded-2xl border border-dashed border-white/20 bg-[#101018]/40 hover:bg-[#101018]/70 hover:border-primary/50 transition-all duration-300 cursor-pointer p-6 text-center group"
          >
            <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-primary group-hover:border-primary/30 transition-colors mb-2">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
            <p className="text-[14px] font-black text-white">Play Video</p>
            <p className="text-[13px] text-zinc-550 mt-0.5 font-medium">Official TMDB video source</p>
          </div>
        )}
      </ExpandableSection>

      {/* Videos List BottomSheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={`More Videos (${videos.length})`}
      >
        <div className="space-y-2.5">
          {videos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => {
                setIsSheetOpen(false);
                setActiveVideoKey(vid.key);
              }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-full bg-white/5 group-hover:bg-primary/20 text-zinc-400 group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
                <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-white group-hover:text-primary transition-colors truncate font-display">
                  {vid.name}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {vid.type} • {vid.site}
                </p>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Trailer Overlay Modal */}
      {activeVideoKey && (
        <TrailerModal 
          isOpen={true}
          onClose={() => setActiveVideoKey(null)}
          youtubeKey={activeVideoKey}
          title={title}
        />
      )}
    </>
  );
}

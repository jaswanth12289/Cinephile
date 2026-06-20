"use client";

import Image from "next/image";
import Link from "next/link";
import { ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { hideRecommendationAction } from "@/actions/recommendations.actions";
import { toast } from "sonner";

interface RecommendationProps {
  id: string; // the mediaId
  title: string;
  posterPath: string;
  reason: string;
  mediaType: "movie" | "tv";
}

export default function RecommendationCard({ id, title, posterPath, reason, mediaType }: RecommendationProps) {
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleHide = (e: React.MouseEvent) => {
    e.preventDefault();
    setHidden(true);
    startTransition(async () => {
      const res = await hideRecommendationAction(id);
      if (!res.success) {
        setHidden(false);
        toast.error("Failed to hide recommendation.");
      } else {
        toast.success("We'll tune your recommendations.");
      }
    });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success("Glad you like this! We'll find more like it.");
  };

  if (hidden) return null;

  return (
    <div className="relative group rounded-xl overflow-hidden bg-[#101018] border border-white/5 h-full flex flex-col">
      <Link href={`/${mediaType}/${id}`} className="block relative aspect-[2/3] overflow-hidden w-full">
        <Image 
          src={`https://image.tmdb.org/t/p/w342${posterPath}`}
          alt={title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-transparent to-transparent opacity-60" />
      </Link>
      
      <div className="p-3 flex flex-col flex-1">
        <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">{title}</h4>
        <div className="flex items-start gap-1.5 mt-auto">
          <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 font-bold leading-tight">{reason}</p>
        </div>
      </div>

      {/* Overlay Feedback Actions */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleHide}
          disabled={isPending}
          className="bg-black/60 hover:bg-red-500/80 backdrop-blur-md p-1.5 rounded-full text-white transition-colors"
          title="Not Interested"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

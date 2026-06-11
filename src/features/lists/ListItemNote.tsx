"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListItemNoteProps {
  note: {
    text: string;
    imageUrl?: string;
  } | string | null;
  listContainsSpoilers: boolean;
}

export function ListItemNote({ note, listContainsSpoilers }: ListItemNoteProps) {
  const [revealed, setRevealed] = useState(!listContainsSpoilers);

  if (!note) return null;

  const text = typeof note === "string" ? note : note.text;
  const imageUrl = typeof note === "string" ? undefined : note.imageUrl;

  if (!text && !imageUrl) return null;

  return (
    <div className="mt-3.5 pl-4 border-l-2 border-primary/40 space-y-2 select-text">
      <div className="relative">
        {listContainsSpoilers && !revealed ? (
          /* Spoiler blurred cover */
          <div 
            onClick={() => setRevealed(true)}
            className="p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
          >
            <div className="flex items-center gap-2 text-amber-500 font-extrabold text-[12.5px] select-none">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Note contains spoilers</span>
            </div>
            <button className="text-[10px] font-black uppercase bg-amber-500/25 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/30 group-hover:bg-amber-500/40 transition-all select-none">
              Reveal
            </button>
          </div>
        ) : (
          /* Note Text */
          <div className="relative">
            {listContainsSpoilers && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-500 border border-amber-500/25 bg-amber-500/5 px-2 py-0.5 rounded-md mb-2 uppercase select-none tracking-wider">
                <AlertTriangle className="h-3 w-3" /> Spoiler Note
              </span>
            )}
            <blockquote className="text-[14px] italic leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
              "{text}"
            </blockquote>
          </div>
        )}
      </div>

      {/* Note attachment image if revealed */}
      {imageUrl && revealed && (
        <div className="mt-2 relative max-w-sm rounded-xl overflow-hidden border border-white/10 shadow-md">
          <Image 
            src={imageUrl} 
            alt="Note attachment" 
            width={400}
            height={200}
            className="object-cover w-full h-auto max-h-[200px]"
          />
        </div>
      )}
    </div>
  );
}

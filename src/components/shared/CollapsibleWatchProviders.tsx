"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleWatchProvidersProps {
  children: React.ReactNode;
}

export function CollapsibleWatchProviders({ children }: CollapsibleWatchProvidersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card/25 backdrop-blur-md rounded-2xl border border-border/30 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 font-black uppercase text-xs sm:text-sm text-white hover:bg-white/5 transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-1.5 font-display tracking-wider">
          🍿 Streaming Availability
        </span>
        {isOpen ? (
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-primary font-display uppercase tracking-wider">
            Collapse <ChevronUp className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-primary font-display uppercase tracking-wider">
            Expand <ChevronDown className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      <div className={cn("transition-all duration-300 border-t border-white/5", isOpen ? "block p-4" : "hidden")}>
        {children}
      </div>
    </div>
  );
}

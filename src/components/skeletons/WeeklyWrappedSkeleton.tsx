import React from "react";
import { Sparkles } from "lucide-react";

export function WeeklyWrappedSkeleton() {
  return (
    <div className="relative bg-gradient-to-r from-[#170E3A] via-[#101026] to-[#25091C] border border-primary/20 rounded-2xl p-5 shadow-2xl overflow-hidden select-none animate-pulse min-h-[164px]">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60 pointer-events-none" />

      <div className="relative space-y-4">
        {/* Headline Header */}
        <div className="flex items-center gap-2 text-primary/40 font-black">
          <Sparkles className="h-4.5 w-4.5 text-amber-400/40" />
          <div className="h-3.5 w-40 bg-primary/20 rounded" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted/40 rounded" />
          <div className="h-3.5 w-72 bg-muted/25 rounded" />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-start gap-3">
              {/* Icon placeholder */}
              <div className="h-8 w-8 rounded-lg bg-muted/15 shrink-0 border border-white/5" />
              
              {/* Text metadata placeholder */}
              <div className="min-w-0 space-y-1.5 flex-1">
                <div className="h-3 w-10 bg-muted/25 rounded" />
                <div className="h-4 w-20 bg-muted/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

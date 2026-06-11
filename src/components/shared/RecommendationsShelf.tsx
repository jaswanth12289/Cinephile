import React from "react";
import Link from "next/link";
import { getRecommendations } from "@/lib/recommendations/getRecommendations";
import { RecommendationsList } from "./RecommendationsList";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface RecommendationsShelfProps {
  uid: string;
}

export async function RecommendationsShelf({ uid }: RecommendationsShelfProps) {
  const recommendations = await getRecommendations(uid);

  // Render empty state if there are no recommendations
  if (recommendations.length === 0) {
    return (
      <section className="cine-glass rounded-2xl p-6 space-y-4 text-center select-none">
        <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[15px] font-extrabold text-white font-display uppercase tracking-wider">
            Rate more movies to unlock recommendations
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-medium">
            The more movies you rate, the smarter Cinephile becomes.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/discover">
            <Button size="sm" className="font-extrabold px-5 rounded-xl">
              Discover Movies
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 w-full py-2">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 pl-3 border-l-4 border-[#E94560] select-none">
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            Recommendations For You
          </h2>
        </div>
      </div>

      {/* Grid of Movie Cards */}
      <RecommendationsList initialRecommendations={recommendations} />
    </section>
  );
}

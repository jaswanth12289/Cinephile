import { getTVRecommendations, getTVDetails } from "@/lib/tmdb/client";
import { MediaCard } from "@/components/shared/MediaCard";
import { PageTransition } from "@/components/shared/PageTransition";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface RecommendationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TVRecommendationsPage({ params }: RecommendationsPageProps) {
  const { id } = await params;

  let show;
  let recommendations;
  try {
    const [showRes, recsRes] = await Promise.all([
      getTVDetails(id),
      getTVRecommendations(id)
    ]);
    show = showRes;
    recommendations = recsRes?.results || [];
  } catch (error) {
    notFound();
  }

  if (!show) notFound();

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#09090F] py-8 pb-16 text-white select-none">
        <div className="max-w-[1440px] mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <Link 
              href={`/tv/${id}`}
              className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display uppercase leading-tight">
                Recommended for you
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Inspired by {show.name}
              </p>
            </div>
          </div>

          {/* Grid */}
          {recommendations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No recommendations found for this show.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-2">
              {recommendations.map((item: any) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  title={item.name}
                  posterPath={item.poster_path}
                  mediaType="tv"
                  rating={item.vote_average}
                  releaseDate={item.first_air_date}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

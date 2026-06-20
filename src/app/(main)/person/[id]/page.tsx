import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPersonDetails } from "@/lib/tmdb/client";
import { PageTransition } from "@/components/shared/PageTransition";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { SafeImage } from "@/components/shared/SafeImage";
import { CarouselSection } from "@/components/shared/CarouselSection";
import { MapPin, Calendar, Star } from "lucide-react";
import Link from "next/link";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const { id } = await params;
  const person = await getPersonDetails(id).catch(() => null);
  if (!person) return { title: "Not Found" };
  return {
    title: `${person.name} | Cinephile`,
    description: person.biography?.substring(0, 160) || `Explore ${person.name}'s movies and TV shows.`,
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const person = await getPersonDetails(id).catch(() => null);
  if (!person) {
    notFound();
  }

  // Determine top acting credits
  const credits = person.combined_credits?.cast || [];
  const actingCredits = credits.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));
  
  // Determine top directing credits
  const crew = person.combined_credits?.crew || [];
  const directingCredits = crew.filter((c: any) => c.job === "Director")
    .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

  const writingCredits = crew.filter((c: any) => c.department === "Writing")
    .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

  const producingCredits = crew.filter((c: any) => c.job === "Producer" || c.job === "Executive Producer")
    .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

  const profileUrl = person.profile_path 
    ? `https://image.tmdb.org/t/p/w780${person.profile_path}` 
    : "/default-avatar.png";

  const knownForDepartment = person.known_for_department || "Acting";

  return (
    <PageTransition>
      <PullToRefresh>
        <div className="min-h-screen pb-20">
          {/* Header Section */}
          <div className="relative pt-10 md:pt-16 px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Profile Image */}
              <div className="shrink-0 w-48 md:w-64 lg:w-72 relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group mx-auto md:mx-0">
                <SafeImage
                  src={profileUrl}
                  alt={person.name}
                  width={400}
                  height={600}
                  className="object-cover w-full h-auto aspect-[2/3] group-hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase font-display leading-none mb-2 text-center md:text-left">
                    {person.name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-400 font-medium">
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white font-bold tracking-wider uppercase text-xs">
                      {knownForDepartment}
                    </span>
                    {person.birthday && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(person.birthday).toLocaleDateString()} {person.deathday && ` - ${new Date(person.deathday).toLocaleDateString()}`}</span>
                      </div>
                    )}
                    {person.place_of_birth && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{person.place_of_birth}</span>
                      </div>
                    )}
                  </div>
                </div>

                {person.biography && (
                  <div className="text-zinc-300 leading-relaxed text-sm md:text-base max-w-4xl opacity-90 whitespace-pre-wrap">
                    {person.biography}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
            {/* Acting */}
            {actingCredits.length > 0 && (
              <CarouselSection
                title="Known For (Acting)"
                data={actingCredits}
                mediaType="movie"
                iconName="star"
                layout="standard"
                slug="acting"
              />
            )}

            {/* Directing */}
            {directingCredits.length > 0 && (
              <CarouselSection
                title="Directed"
                data={directingCredits}
                mediaType="movie"
                iconName="video"
                layout="standard"
                slug="directing"
              />
            )}

            {/* Writing */}
            {writingCredits.length > 0 && (
              <CarouselSection
                title="Written By"
                data={writingCredits}
                mediaType="movie"
                iconName="pen"
                layout="standard"
                slug="writing"
              />
            )}

            {/* Producing */}
            {producingCredits.length > 0 && (
              <CarouselSection
                title="Produced"
                data={producingCredits}
                mediaType="movie"
                iconName="briefcase"
                layout="standard"
                slug="producing"
              />
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}

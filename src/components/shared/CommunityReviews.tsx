import Link from "next/link";
import Image from "next/image";
import { Star, Heart, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SafeImage } from "./SafeImage";

interface ReviewItem {
  id: string;
  movieTitle: string;
  posterPath: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  userName: string;
  userPhoto?: string;
  rating: number;
  content: string;
  likes: number;
}

const fallbackReviews: ReviewItem[] = [
  {
    id: "fr1",
    movieTitle: "RRR",
    posterPath: "/wdrCwjR5x5NmFY5rwv45zpbz7C8.jpg",
    mediaId: "579974",
    mediaType: "movie",
    userName: "Pranav Kumar",
    rating: 5,
    content: "An absolute masterclass in cinematic maximalism! The Naatu Naatu dance sequence and the animal escape scene are legendary.",
    likes: 342,
  },
  {
    id: "fr2",
    movieTitle: "Interstellar",
    posterPath: "/gEU2QvEOmfcFgawjJySy67J4nUI.jpg",
    mediaId: "157336",
    mediaType: "movie",
    userName: "Elena Rostova",
    rating: 4.5,
    content: "The organ soundtrack by Hans Zimmer combined with Nolan's visual scale makes this one of the most emotional sci-fi movies ever.",
    likes: 219,
  },
  {
    id: "fr3",
    movieTitle: "Severance",
    posterPath: "/qm9U8p9gU2451C8407Jd693S850.jpg",
    mediaId: "95396",
    mediaType: "tv",
    userName: "Marcus Vance",
    rating: 5,
    content: "The finale is hands down the most intense 45 minutes of television I've watched in years. Pitch-perfect corporate satire.",
    likes: 188,
  }
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5 text-primary">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < Math.round(count) ? "fill-primary stroke-primary" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export async function CommunityReviews() {
  let reviews: ReviewItem[] = [];

  try {
    const supabase = createServiceClient();
    const { data: snap } = await supabase
      .from("activities")
      .select("*, profiles!activities_user_id_fkey(display_name, avatar_url)")
      .eq("type", "reviewed")
      .order("created_at", { ascending: false })
      .limit(6);

    const reviewActivities = (snap || [])
      .filter((act) => act.review_text)
      .slice(0, 3);

    reviews = reviewActivities.map((act) => {
      const userData = act.profiles;
      const snapshot = act.media_snapshot as any || {};
      const posterPath = snapshot.posterPath || snapshot.poster_path || "/placeholder-poster.png";

      return {
        id: act.id,
        movieTitle: snapshot.title || "Film Review",
        posterPath,
        mediaId: snapshot.id || act.movie_id || act.tv_id,
        mediaType: snapshot.mediaType || (act.movie_id ? "movie" : "tv"),
        userName: userData?.display_name ?? "Cinephile User",
        userPhoto: userData?.avatar_url || undefined,
        rating: act.rating || 0,
        content: act.review_text!,
        likes: act.likes_count ?? 0,
      };
    });
  } catch (err) {
    console.warn("[CommunityReviews] Error loading reviews:", err);
  }

  // Fallback if empty
  const activeReviews = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <h2 className="text-2xl font-bold tracking-widest uppercase text-white border-l-4 border-primary pl-4">
          Popular Reviews
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeReviews.map((rev, idx) => {
          const safePoster = rev.posterPath?.startsWith("/")
            ? rev.posterPath
            : `/${rev.posterPath}`;
          const posterSrc = safePoster.startsWith('/placeholder')
            ? safePoster
            : `https://image.tmdb.org/t/p/w185${safePoster}`;

          return (
            <Card 
              key={rev.id} 
              className="border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
            >
              <CardContent className="p-4 flex gap-4">
                {/* Small Poster Thumbnail */}
                <Link href={`/${rev.mediaType}/${rev.mediaId}`} className="flex-shrink-0">
                  <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <SafeImage
                      src={posterSrc}
                      alt={rev.movieTitle}
                      fill
                      className="object-cover"
                      sizes="64px"
                      fallbackSrc="/placeholder-poster.svg"
                    />
                  </div>
                </Link>

                {/* Review Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-200 truncate">
                        {rev.userName}
                      </span>
                      <StarRating count={rev.rating} />
                    </div>
                    <Link href={`/${rev.mediaType}/${rev.mediaId}`} className="text-[11px] font-black text-white hover:text-primary transition-colors block truncate">
                      {rev.movieTitle}
                    </Link>
                    <p className="text-[11px] text-gray-400 italic line-clamp-2 leading-relaxed">
                      "{rev.content}"
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1.5 mt-1 border-t border-white/5">
                    <Heart className="h-3 w-3 fill-primary/10 text-primary" />
                    <span className="font-extrabold">{rev.likes} likes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

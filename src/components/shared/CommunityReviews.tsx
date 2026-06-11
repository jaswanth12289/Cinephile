import Link from "next/link";
import Image from "next/image";
import { Star, Heart, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminDb } from "@/lib/firebase/admin";
import { cn } from "@/lib/utils";

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
    const snap = await adminDb
      .collection("activities")
      .where("type", "==", "reviewed")
      .limit(6)
      .get();

    const reviewActivities = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((act) => act.reviewText)
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 3);

    // Deduplicate user IDs and fetch profiles in parallel
    const uniqueUserIds = Array.from(new Set(reviewActivities.map((act) => act.userId).filter(Boolean)));
    const userDocs = await Promise.all(
      uniqueUserIds.map((uid) => adminDb.collection("users").doc(uid).get())
    );

    const userMap: Record<string, any> = {};
    userDocs.forEach((doc) => {
      if (doc.exists) {
        userMap[doc.id] = doc.data();
      }
    });

    reviews = reviewActivities.map((act) => {
      const userData = userMap[act.userId];
      const snapshot = act.mediaSnapshot || {};
      const posterPath = snapshot.posterPath || "/placeholder-poster.png";

      return {
        id: act.id,
        movieTitle: snapshot.title || "Film Review",
        posterPath,
        mediaId: snapshot.id || act.movieId || act.mediaId,
        mediaType: snapshot.mediaType || "movie",
        userName: userData?.displayName ?? "Cinephile User",
        userPhoto: userData?.photoURL,
        rating: act.rating || 0,
        content: act.reviewText,
        likes: act.likesCount ?? 0,
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
        <h2 className="text-2xl font-bold tracking-widest uppercase text-white border-l-4 border-[#E94560] pl-4">
          Popular Reviews
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeReviews.map((rev) => {
          const safePoster = rev.posterPath?.startsWith("/")
            ? rev.posterPath
            : `/${rev.posterPath}`;
          const posterSrc = safePoster.startsWith('/placeholder')
            ? safePoster
            : `https://image.tmdb.org/t/p/w185${safePoster}`;

          return (
            <Card 
              key={rev.id} 
              className="border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-[#E94560]"
            >
              <CardContent className="p-4 flex gap-4">
                {/* Small Poster Thumbnail */}
                <Link href={`/${rev.mediaType}/${rev.mediaId}`} className="flex-shrink-0">
                  <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={posterSrc}
                      alt={rev.movieTitle}
                      fill
                      className="object-cover"
                      sizes="64px"
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

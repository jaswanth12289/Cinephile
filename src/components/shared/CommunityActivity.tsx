import Link from "next/link";
import Image from "next/image";
import { Activity, Eye, Bookmark, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SafeImage } from "./SafeImage";
import { SafeAvatar } from "./SafeAvatar";

interface ActivityItem {
  id: string;
  userName: string;
  userPhoto?: string;
  action: "watched" | "watchlist" | "liked" | string;
  movieTitle: string;
  posterPath: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  time: string;
}

const fallbackActivities: ActivityItem[] = [
  {
    id: "fa1",
    userName: "Rahul Sharma",
    action: "marked as Watched",
    movieTitle: "Kalki 2898 AD",
    posterPath: "https://image.tmdb.org/t/p/w185/9m161Gv12gTcvu4bV3sHq39A86p.jpg",
    mediaId: "1010818",
    mediaType: "movie",
    time: "2h ago",
  },
  {
    id: "fa2",
    userName: "Sneha Reddy",
    action: "added to Watchlist",
    movieTitle: "Demon Slayer",
    posterPath: "https://image.tmdb.org/t/p/w185/xBHvZ22DG7ig36JRI4w6Spj4TE1.jpg",
    mediaId: "85937",
    mediaType: "tv",
    time: "4h ago",
  },
  {
    id: "fa3",
    userName: "Vikram Sen",
    action: "liked a review for",
    movieTitle: "Manjummel Boys",
    posterPath: "https://image.tmdb.org/t/p/w185/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg",
    mediaId: "1216221",
    mediaType: "movie",
    time: "5h ago",
  }
];

export async function CommunityActivity() {
  let activities: ActivityItem[] = [];

  try {
    const supabase = createServiceClient();
    const { data: snap } = await supabase
      .from("activities")
      .select("*, profiles(display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(3);

    for (const data of snap || []) {
      const userData = data.profiles;

      // Poster fallback mapping
      let poster = "/placeholder-poster.svg";
      const tmdbPath = (data.media_snapshot as any)?.posterPath || (data.media_snapshot as any)?.poster_path;
      if (tmdbPath) {
        poster = tmdbPath.startsWith("http") ? tmdbPath : `https://image.tmdb.org/t/p/w185${tmdbPath.startsWith("/") ? "" : "/"}${tmdbPath}`;
      } else if (data.movie_id === "1010818") {
        poster = "https://image.tmdb.org/t/p/w185/9m161Gv12gTcvu4bV3sHq39A86p.jpg";
      }

      const movieTitle = (data.media_snapshot as any)?.title || data.list_title || "Film Details";
      const mediaId = data.movie_id || data.tv_id || data.list_id || "";
      const mediaType = data.movie_id ? "movie" : (data.tv_id ? "tv" : "movie");

      activities.push({
        id: data.id,
        userName: userData?.display_name ?? "Cinephile User",
        userPhoto: userData?.avatar_url || undefined,
        action: data.type === "reviewed" ? "reviewed" : "tracked",
        movieTitle,
        posterPath: poster,
        mediaId,
        mediaType: mediaType as any,
        time: "Just now",
      });
    }
  } catch (err) {
    console.warn("[CommunityActivity] Error loading activities:", err);
  }

  const activeActivities = activities.length > 0 ? [...activities, ...fallbackActivities].slice(0, 3) : fallbackActivities;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-black tracking-tight text-white uppercase">
          Friend & Community Activity
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeActivities.map((act, idx) => {
          let ActionIcon = Eye;
          let iconColor = "text-emerald-400 bg-emerald-400/10";
          
          if (act.action.includes("Watchlist") || act.action.includes("watchlist")) {
            ActionIcon = Bookmark;
            iconColor = "text-primary bg-primary/10";
          } else if (act.action.includes("like") || act.action.includes("liked")) {
            ActionIcon = Heart;
            iconColor = "text-amber-400 bg-amber-400/10";
          }

          return (
            <Card key={act.id} className="border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl hover:border-border/60 hover:bg-card/40 transition-all duration-300">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                {/* Avatar | User Info | Small Poster layout */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <SafeAvatar
                    src={act.userPhoto}
                    alt={act.userName}
                    name={act.userName}
                    size={32}
                    className="border-border/30 mt-0.5"
                  />
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <p className="text-xs text-gray-300 font-medium">
                      <span className="font-extrabold text-white">{act.userName}</span>
                    </p>
                    <div className="flex items-center gap-1.5 py-0.5">
                      <div className={cn("p-1 rounded", iconColor)}>
                        <ActionIcon className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{act.action}</span>
                    </div>
                    <Link href={`/${act.mediaType}/${act.mediaId}`} className="text-xs font-black text-primary hover:underline line-clamp-2 block leading-snug">
                      {act.movieTitle}
                    </Link>
                    <p className="text-[9px] text-muted-foreground">{act.time}</p>
                  </div>
                </div>

                {/* Poster Thumbnail */}
                <Link href={`/${act.mediaType}/${act.mediaId}`} className="relative w-14 h-20 rounded bg-muted/20 overflow-hidden flex-shrink-0 border border-border/20 shadow-md">
                  <SafeImage
                    src={act.posterPath}
                    alt={act.movieTitle}
                    fill
                    sizes="56px"
                    className="object-cover w-14 h-20"
                    fallbackSrc="/placeholder-poster.svg"
                  />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Activity, Eye, Bookmark, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminDb } from "@/lib/firebase/admin";
import { cn } from "@/lib/utils";

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
    posterPath: "/9m161Gv12gTcvu4bV3sHq39A86p.jpg",
    mediaId: "1010818",
    mediaType: "movie",
    time: "2h ago",
  },
  {
    id: "fa2",
    userName: "Sneha Reddy",
    action: "added to Watchlist",
    movieTitle: "Demon Slayer",
    posterPath: "/xBHvZ22DG7ig36JRI4w6Spj4TE1.jpg",
    mediaId: "85937",
    mediaType: "tv",
    time: "4h ago",
  },
  {
    id: "fa3",
    userName: "Vikram Sen",
    action: "liked a review for",
    movieTitle: "Manjummel Boys",
    posterPath: "/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg",
    mediaId: "1216221",
    mediaType: "movie",
    time: "5h ago",
  }
];

export async function CommunityActivity() {
  let activities: ActivityItem[] = [];

  try {
    const snap = await adminDb
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    const uids = Array.from(
      new Set(
        snap.docs
          .map((doc) => doc.data().userId || doc.data().actorId)
          .filter((uid): uid is string => typeof uid === "string" && uid.length > 0)
      )
    );

    const userDocs = uids.length > 0
      ? await Promise.all(uids.map((uid) => adminDb.collection("users").doc(uid).get()))
      : [];

    const userMap: Record<string, any> = {};
    userDocs.forEach((doc) => {
      if (doc.exists) {
        userMap[doc.id] = doc.data();
      }
    });

    for (const doc of snap.docs) {
      const data = doc.data();
      const targetUid = data.userId || data.actorId;
      if (!targetUid || typeof targetUid !== "string") continue;
      
      const userData = userMap[targetUid];

      // Poster fallback mapping
      let posterPath = "/placeholder-poster.png";
      if (data.mediaSnapshot?.posterPath) {
        posterPath = data.mediaSnapshot.posterPath;
      } else if (data.activitySnapshot?.posterIds?.[0]) {
        posterPath = data.activitySnapshot.posterIds[0];
      } else if (data.mediaId === "1010818") posterPath = "/9m161Gv12gTcvu4bV3sHq39A86p.jpg";
      else if (data.mediaId === "85937") posterPath = "/xBHvZ22DG7ig36JRI4w6Spj4TE1.jpg";
      else if (data.mediaId === "1216221") posterPath = "/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg";

      const movieTitle = data.mediaSnapshot?.title || data.listTitle || "Film Details";
      const mediaId = data.movieId || data.tvId || data.listId || data.mediaId || "";
      const mediaType = data.movieId ? "movie" : (data.tvId ? "tv" : (data.listId ? "list" : (data.mediaType ?? "movie")));

      activities.push({
        id: doc.id,
        userName: userData?.displayName ?? "Cinephile User",
        userPhoto: userData?.photoURL,
        action: data.type === "review" || data.type === "reviewed" ? "reviewed" : "tracked",
        movieTitle,
        posterPath,
        mediaId,
        mediaType: mediaType === "list" ? "movie" : mediaType as any, // fallback list items to movie details redirect
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
        {activeActivities.map((act) => {
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
                {/* User avatar + action details */}
                <div className="flex items-start gap-3 min-w-0">
                  {act.userPhoto ? (
                    <Image
                      src={act.userPhoto}
                      alt={act.userName}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover mt-0.5 border border-border/30"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs mt-0.5 border border-border/30">
                      {act.userName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs text-gray-300 font-medium">
                      <span className="font-extrabold text-white">{act.userName}</span>
                    </p>
                    <div className="flex items-center gap-1.5 py-0.5">
                      <div className={cn("p-1 rounded", iconColor)}>
                        <ActionIcon className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{act.action}</span>
                    </div>
                    <Link href={`/${act.mediaType}/${act.mediaId}`} className="text-xs font-black text-primary hover:underline truncate block">
                      {act.movieTitle}
                    </Link>
                    <p className="text-[9px] text-muted-foreground">{act.time}</p>
                  </div>
                </div>

                {/* Poster Thumbnail */}
                <Link href={`/${act.mediaType}/${act.mediaId}`} className="relative h-16 aspect-[2/3] rounded bg-muted/20 overflow-hidden flex-shrink-0 border border-border/20 shadow-md">
                  <Image
                    src={act.posterPath.startsWith('/placeholder') ? act.posterPath : `https://image.tmdb.org/t/p/w185${act.posterPath}`}
                    alt={act.movieTitle}
                    fill
                    sizes="45px"
                    className="object-cover"
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

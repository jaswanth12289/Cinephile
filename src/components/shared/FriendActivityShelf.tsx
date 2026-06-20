import { adminDb } from "@/lib/firebase/admin";
import { SafeAvatar } from "./SafeAvatar";
import Link from "next/link";
import { Clock } from "lucide-react";

export default async function FriendActivityShelf({ uid }: { uid: string }) {
  // 1. Get user's following list
  const followingSnap = await adminDb.collection("users").doc(uid).collection("following").get();
  if (followingSnap.empty) return null;

  const followingIds = followingSnap.docs.map(doc => doc.id);
  
  // Firestore limit for IN queries is 30.
  // We'll query activities for the first 30 followed users.
  const activeIds = followingIds.slice(0, 30);

  // 2. Fetch recent activities from those users
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let activitiesSnap;
  try {
    activitiesSnap = await adminDb.collection("activities")
      .where("userId", "in", activeIds)
      .where("createdAt", ">=", thirtyDaysAgo)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
  } catch (error) {
    console.error("FriendActivityShelf query failed:", error);
    return null;
  }

  if (activitiesSnap.empty) return null;

  const activities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  // 3. Fetch user docs for avatars
  const actorIds = Array.from(new Set(activities.map(a => a.userId)));
  const actorsMap: Record<string, any> = {};
  
  if (actorIds.length > 0) {
    try {
      const actorDocs = await adminDb.collection("users").where("uid", "in", actorIds).get();
      actorDocs.forEach(doc => {
        actorsMap[doc.id] = doc.data();
      });
    } catch (e) {}
  }

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4 px-4 sm:px-0">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-black text-white font-display uppercase tracking-wider">Friend Activity</h2>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0">
        {activities.map(activity => {
          const actor = actorsMap[activity.userId];
          if (!actor) return null;

          let text = "did something";
          if (activity.type === "watched") text = "watched";
          if (activity.type === "reviewed") text = "reviewed";
          if (activity.type === "watchlist_added") text = "wants to watch";
          if (activity.type === "post") text = "shared a thought";
          
          const mediaTitle = activity.mediaSnapshot?.title || "";

          return (
            <Link href={`/u/${actor.username}`} key={activity.id} className="shrink-0 w-64 bg-[#101018] border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors group">
              <SafeAvatar src={actor.photoURL} alt={actor.displayName} name={actor.displayName} size={36} className="border border-white/5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white line-clamp-2 leading-tight">
                  <span className="font-bold group-hover:text-primary transition-colors">{actor.displayName}</span> {text} <span className="font-bold text-zinc-300">{mediaTitle}</span>
                </p>
                {activity.rating && (
                  <div className="text-[10px] text-amber-500 font-bold mt-1">★ {activity.rating}/5</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

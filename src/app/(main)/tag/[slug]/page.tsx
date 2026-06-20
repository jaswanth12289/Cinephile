import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/actions/auth.actions";
import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/PageTransition";
import { Hash } from "lucide-react";
import { FeedCard } from "@/components/shared/FeedCard";
import { FollowTagButton } from "@/components/shared/FollowTagButton";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const tag = slug.toLowerCase();

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  const followingTags = userDoc.data()?.followingTags || [];
  const isFollowing = followingTags.includes(tag);

  // Fetch activities that have this hashtag
  const snap = await adminDb
    .collection("activities")
    .where("type", "==", "post")
    .where("hashtags", "array-contains", tag)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const activities = snap.docs.map(doc => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
    };
  });

  // Fetch actors
  const actorIds = Array.from(new Set(activities.map((a: any) => a.userId)));
  const actorsMap: Record<string, any> = {};
  
  if (actorIds.length > 0) {
    for (let i = 0; i < actorIds.length; i += 10) {
      const batch = actorIds.slice(i, i + 10);
      try {
        const uSnap = await adminDb.collection("users").where("__name__", "in", batch).get();
        uSnap.docs.forEach(doc => {
          actorsMap[doc.id] = { ...doc.data(), uid: doc.id };
        });
      } catch (e) {
        console.warn("Error fetching actors for tag page", e);
      }
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0F0F1A] py-5 pb-10">
        <div className="max-w-2xl mx-auto px-3 md:px-4 space-y-4">
          
          <div className="sticky top-0 z-40 bg-[#0F0F1A]/85 backdrop-blur-md pb-4 pt-4 border-b border-white/5 flex flex-col gap-1 select-none">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-[24px] font-black text-white uppercase tracking-tight font-display">
                  {tag}
                </h1>
              </div>
              <FollowTagButton tag={tag} initialIsFollowing={isFollowing} />
            </div>
            <p className="text-sm text-zinc-400 pl-12">{activities.length} posts with this tag</p>
          </div>

          <div className="space-y-4 mt-4">
            {activities.length === 0 ? (
              <div className="cine-card p-10 flex flex-col items-center justify-center text-center space-y-3 mt-4">
                <Hash className="h-12 w-12 text-zinc-800" />
                <h3 className="text-lg font-bold text-white">No posts found</h3>
                <p className="text-zinc-500 text-sm max-w-[250px]">
                  Be the first to share a thought with #{tag}!
                </p>
              </div>
            ) : (
              activities.map((act) => (
                <FeedCard
                  key={act.id}
                  activity={act as any}
                  actor={actorsMap[act.userId] || { displayName: "User", username: "user" }}
                  initialReactions={act.reactions || {}}
                  initialUserReaction={act.reactions?.[session.uid] || null}
                  initialSaved={false}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

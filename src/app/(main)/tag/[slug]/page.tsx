import { createServiceClient } from "@/lib/supabase/server";
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

  const supabase = createServiceClient();
  const { data: userDoc } = await supabase.from("profiles").select("following_tags").eq("id", session.id).single();
  const followingTags = userDoc?.following_tags || [];
  const isFollowing = followingTags.includes(tag);

  // Fetch activities that have this hashtag
  const { data: snap } = await supabase
    .from("activities")
    .select("*, profiles!activities_user_id_fkey(display_name, username, avatar_url)")
    .eq("type", "post")
    .contains("hashtags", [tag])
    .order("created_at", { ascending: false })
    .limit(20);

  const activities = (snap || []).map((doc: any) => ({
    id: doc.id,
    ...doc,
    createdAt: doc.created_at,
    userId: doc.user_id,
  }));

  const actorsMap: Record<string, any> = {};
  activities.forEach((act) => {
    actorsMap[act.userId] = {
      displayName: act.profiles?.display_name,
      username: act.profiles?.username,
      photoURL: act.profiles?.avatar_url,
    };
  });

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
                  initialUserReaction={act.reactions?.[session.id] || null}
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

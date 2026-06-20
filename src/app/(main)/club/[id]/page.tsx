import { adminDb } from "@/lib/firebase/admin";
import { notFound } from "next/navigation";
import { verifySession } from "@/actions/auth.actions";
import { Users, Hash } from "lucide-react";
import CreatePostBox from "@/components/shared/CreatePostBox";
import { FeedCard } from "@/components/shared/FeedCard";

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  const { id: clubId } = await params;

  const clubDoc = await adminDb.collection("clubs").doc(clubId).get();
  if (!clubDoc.exists) notFound();

  const clubData = clubDoc.data() as any;

  let isMember = false;
  if (session) {
    const memberDoc = await adminDb.collection("clubs").doc(clubId).collection("members").doc(session.uid).get();
    isMember = memberDoc.exists;
  }

  // Fetch activities for this club
  const snap = await adminDb
    .collection("activities")
    .where("type", "==", "post")
    .where("clubId", "==", clubId)
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

  const actorIds = Array.from(new Set(activities.map((a: any) => a.userId)));
  const actorDocs = await Promise.all(actorIds.map(id => adminDb.collection("users").doc(id).get()));
  const actorsMap: Record<string, any> = {};
  actorDocs.forEach(doc => {
    if (doc.exists) actorsMap[doc.id] = doc.data();
  });

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Club Header */}
      <div className="relative overflow-hidden bg-[#101018] border-b border-white/5 py-10 px-4 sm:px-6">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-transparent opacity-50"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black font-display text-white tracking-wide mb-2">{clubData.title}</h1>
            <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">{clubData.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                <Users className="h-4 w-4" /> {clubData.membersCount || 0} members
              </span>
              {clubData.tags?.map((t: string) => (
                <span key={t} className="text-[10px] text-zinc-400 uppercase font-black tracking-wider bg-white/5 px-2 py-1 rounded-md">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0">
            {session ? (
              <form action={async () => {
                "use server";
                const { joinClubAction, leaveClubAction } = await import("@/actions/admin.actions");
                if (isMember) {
                  await leaveClubAction(clubId);
                } else {
                  await joinClubAction(clubId);
                }
              }}>
                <button 
                  type="submit" 
                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                    isMember 
                      ? "bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:border-white/30" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                  }`}
                >
                  {isMember ? "Leave Club" : "Join Club"}
                </button>
              </form>
            ) : (
              <div className="px-6 py-2.5 rounded-full font-bold text-sm bg-white/5 text-zinc-500 border border-white/10">
                Login to join
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-6">
        {isMember ? (
          <div className="mb-8">
            <CreatePostBox clubId={clubId} clubName={clubData.title} />
          </div>
        ) : (
          <div className="mb-8 p-6 rounded-2xl bg-black/20 border border-amber-500/10 text-center">
            <p className="text-amber-500 font-bold text-sm">Join this club to share your thoughts with the community.</p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" /> Club Discussions
          </h2>

          {activities.length === 0 ? (
            <div className="cine-card p-10 flex flex-col items-center justify-center text-center space-y-3">
              <Users className="h-12 w-12 text-zinc-800" />
              <h3 className="text-lg font-bold text-white">No discussions yet</h3>
              <p className="text-zinc-500 text-sm max-w-[250px]">
                Be the first to share a thought in this club!
              </p>
            </div>
          ) : (
            activities.map((act) => (
              <FeedCard
                key={act.id}
                activity={act as any}
                actor={actorsMap[act.userId] || { displayName: "User", username: "user" }}
                initialReactions={act.reactions || {}}
                initialUserReaction={act.reactions?.[session?.uid || ""] || null}
                initialSaved={false}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

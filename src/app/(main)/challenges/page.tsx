import { adminDb } from "@/lib/firebase/admin";
import { Trophy, Clock, Search } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Weekly Challenges | Cinephile",
  description: "Participate in weekly challenges to earn special badges.",
};

export default async function ChallengesPage() {
  const now = new Date();
  
  // Fetch active challenges (endsAt > now)
  const challengesSnap = await adminDb
    .collection("challenges")
    .where("endsAt", ">", now)
    .orderBy("endsAt", "asc")
    .get();
  
  const challenges = challengesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    endsAt: doc.data().endsAt.toDate()
  })) as any[];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
      <div className="flex flex-col mb-8 space-y-2">
        <h1 className="text-3xl font-black font-display text-white tracking-wide flex items-center gap-2">
          <Trophy className="h-8 w-8 text-amber-500" /> Weekly Challenges
        </h1>
        <p className="text-zinc-400 text-sm">Complete challenges by sharing your thoughts to earn exclusive badges.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {challenges.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 bg-[#101018] rounded-2xl border border-white/5">
            No active challenges at the moment. Check back later!
          </div>
        ) : (
          challenges.map(challenge => {
            const timeRemainingMs = challenge.endsAt.getTime() - now.getTime();
            const daysRemaining = Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24));
            
            return (
              <div key={challenge.id} className="bg-[#101018] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                  <Trophy className="h-40 w-40 text-white" />
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-white mb-2">{challenge.title}</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4">{challenge.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      <Trophy className="h-3.5 w-3.5" /> Reward: {challenge.rewardBadge}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-white/5 text-zinc-300 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5" /> {daysRemaining} days left
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center md:border-l border-white/5 md:pl-6">
                  <Link href={`/search?q=%23${challenge.title.replace(/\s+/g, '')}`} className="btn-primary text-sm font-bold w-full md:w-auto justify-center">
                    <Search className="h-4 w-4 mr-2" /> View Entries
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

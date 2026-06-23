import { Trophy } from "lucide-react";

export default function ChallengesPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md space-y-4 cine-card p-10 bg-black/40 border border-white/5">
        <div className="h-20 w-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Trophy className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">Challenges</h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed">
          Participate in weekly and monthly film watching challenges to earn exclusive profile badges and climb the leaderboard.
        </p>
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

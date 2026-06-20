import { Trophy, Users, Activity } from "lucide-react";

export function WeeklyChallenge() {
  return (
    <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 justify-between select-none">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Weekly Challenge</p>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Sci-Fi September</h2>
          <p className="text-sm text-zinc-400 mt-1">Watch 3 Sci-Fi movies this week to earn the badge.</p>
        </div>
      </div>
      <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-colors whitespace-nowrap">
        Join Challenge
      </button>
    </div>
  );
}

export function PopularClubs() {
  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-[18px] font-bold tracking-tight text-white uppercase">Popular Clubs</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: "A24 Fanatics", members: 1240 },
          { name: "Horror Hounds", members: 890 },
          { name: "Sci-Fi Enthusiasts", members: 1560 },
        ].map(club => (
          <div key={club.name} className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">{club.name}</p>
              <p className="text-xs text-zinc-500">{club.members} members</p>
            </div>
            <button className="px-3 py-1.5 rounded-full bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors">
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MostActiveMembers() {
  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Activity className="w-4 h-4 text-amber-500" />
        <h2 className="text-[18px] font-bold tracking-tight text-white uppercase">Most Active Members</h2>
      </div>
      <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-white/5">
        <p className="text-sm text-zinc-400">Activity rankings are being computed...</p>
      </div>
    </div>
  );
}

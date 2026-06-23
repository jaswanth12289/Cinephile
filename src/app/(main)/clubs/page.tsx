import { Users } from "lucide-react";

export default function MovieClubsPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md space-y-4 cine-card p-10 bg-black/40 border border-white/5">
        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(233,69,96,0.15)]">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">Movie Clubs</h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed">
          Create and join exclusive movie clubs. Watch together, discuss, and build your own cinematic community.
        </p>
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(233,69,96,0.2)]">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

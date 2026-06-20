import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import { Users, Search, PlayCircle } from "lucide-react";
import { verifySession } from "@/actions/auth.actions";

export const metadata = {
  title: "Movie Clubs | Cinephile",
  description: "Join movie clubs to discuss your favorite genres and themes.",
};

export default async function ClubsPage() {
  const session = await verifySession();
  const clubsSnap = await adminDb.collection("clubs").orderBy("membersCount", "desc").get();
  
  const clubs = clubsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[];

  let userMemberships = new Set<string>();
  if (session && clubs.length > 0) {
    const membershipRefs = clubs.map(c => adminDb.collection("clubs").doc(c.id).collection("members").doc(session.uid));
    const membershipDocs = await adminDb.getAll(...membershipRefs);
    membershipDocs.forEach(doc => {
      if (doc.exists) {
        userMemberships.add(doc.ref.parent.parent!.id);
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
      <div className="flex flex-col mb-8 space-y-2">
        <h1 className="text-3xl font-black font-display text-white tracking-wide flex items-center gap-2">
          <PlayCircle className="h-8 w-8 text-primary" /> Movie Clubs
        </h1>
        <p className="text-zinc-400 text-sm">Join exclusive communities tailored to your cinematic tastes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clubs.length === 0 ? (
          <div className="col-span-full p-8 text-center text-zinc-500 bg-[#101018] rounded-2xl border border-white/5">
            No clubs available yet.
          </div>
        ) : (
          clubs.map(club => {
            const isMember = userMemberships.has(club.id);
            return (
              <Link key={club.id} href={`/club/${club.id}`} className="block group">
                <div className="bg-[#101018] hover:bg-white/5 border border-white/5 group-hover:border-white/10 rounded-2xl p-5 h-full flex flex-col transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{club.title}</h2>
                    {isMember && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">Joined</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">
                    {club.description}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                      <Users className="h-4 w-4" />
                      {club.membersCount || 0} members
                    </div>
                    {club.tags && club.tags.length > 0 && (
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider bg-black/40 px-2 py-1 rounded-md">
                        {club.tags[0]}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

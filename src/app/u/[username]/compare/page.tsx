import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/actions/auth.actions";
import { notFound, redirect } from "next/navigation";
import { calculateUserSimilarity } from "@/lib/similarity";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { getMovieDetails } from "@/lib/tmdb/client";
import Image from "next/link"; // oops, next/image
import NextImage from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, Heart } from "lucide-react";

export const metadata = {
  title: "Compare Profiles | Cinephile",
};

export default async function CompareProfilesPage({ params }: { params: Promise<{ username: string }> }) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { username } = await params;
  const usernameLower = username.toLowerCase();

  // Get Target User
  const targetUsernameDoc = await adminDb.collection("usernames").doc(usernameLower).get();
  if (!targetUsernameDoc.exists) notFound();
  
  const targetUid = targetUsernameDoc.data()?.uid;
  if (targetUid === session.uid) redirect(`/u/${username}`);

  const [currentUserDoc, targetUserDoc] = await Promise.all([
    adminDb.collection("users").doc(session.uid).get(),
    adminDb.collection("users").doc(targetUid).get()
  ]);

  if (!currentUserDoc.exists || !targetUserDoc.exists) notFound();

  const currentUser = currentUserDoc.data()!;
  const targetUser = targetUserDoc.data()!;

  const similarity = await calculateUserSimilarity(session.uid, targetUid);

  // Fetch TMDB posters for highly rated shared movies (limit 10 for performance)
  const sharedMoviesDetails = await Promise.all(
    similarity.sharedHighlyRatedMediaIds.slice(0, 10).map(async (id) => {
      try {
        return await getMovieDetails(id);
      } catch (e) {
        return null;
      }
    })
  );
  
  const validSharedMovies = sharedMoviesDetails.filter(Boolean);

  return (
    <div className="min-h-screen bg-[#09090F] pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        <Link href={`/u/${username}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 text-sm font-bold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-16">
          {/* Current User */}
          <div className="flex flex-col items-center gap-3">
            <SafeAvatar src={currentUser.photoURL} alt={currentUser.displayName} name={currentUser.displayName} size={96} className="h-24 w-24 border-4 border-white/5" />
            <div className="text-center">
              <h2 className="text-lg font-black text-white">{currentUser.displayName}</h2>
              <p className="text-xs text-zinc-500 font-bold">@{currentUser.username}</p>
            </div>
          </div>

          {/* Match Score */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-[#101018] bg-[#09090F] shadow-[0_0_40px_rgba(245,158,11,0.15)] z-10">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                <circle 
                  cx="64" cy="64" r="58" 
                  stroke="#F59E0B" strokeWidth="6" fill="none" 
                  strokeDasharray="364" 
                  strokeDashoffset={364 - (364 * similarity.similarityScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="text-center">
                <span className="block text-3xl font-black text-amber-500 leading-none">{similarity.similarityScore}%</span>
                <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Match</span>
              </div>
            </div>
          </div>

          {/* Target User */}
          <div className="flex flex-col items-center gap-3">
            <SafeAvatar src={targetUser.photoURL} alt={targetUser.displayName} name={targetUser.displayName} size={96} className="h-24 w-24 border-4 border-white/5" />
            <div className="text-center">
              <h2 className="text-lg font-black text-white">{targetUser.displayName}</h2>
              <p className="text-xs text-zinc-500 font-bold">@{targetUser.username}</p>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#101018] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Taste Breakdown
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-zinc-400">Shared Genres</span>
                  <span className="text-white">{similarity.sharedGenresCount} / 3</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(similarity.sharedGenresCount / 3) * 100}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-zinc-400">Shared Favorites</span>
                  <span className="text-white">{similarity.sharedFavoritesCount} / 4</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(similarity.sharedFavoritesCount / 4) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-zinc-400">Shared Highly Rated Movies</span>
                  <span className="text-white">{similarity.sharedHighlyRatedCount}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((similarity.sharedHighlyRatedCount / 10) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#101018] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" /> Movies You Both Love
            </h3>
            {validSharedMovies.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                No highly rated movies in common yet.
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {validSharedMovies.map((movie: any) => (
                  <Link href={`/movie/${movie.id}`} key={movie.id} className="relative aspect-[2/3] rounded-md overflow-hidden hover:scale-105 transition-transform block">
                    {movie.poster_path ? (
                      <NextImage src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`} alt={movie.title} fill sizes="100px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center p-1 text-center text-[8px]">{movie.title}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            {similarity.sharedHighlyRatedCount > 10 && (
              <p className="text-[10px] text-zinc-500 text-center mt-4 uppercase tracking-wider font-bold">
                + {similarity.sharedHighlyRatedCount - 10} more movies
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

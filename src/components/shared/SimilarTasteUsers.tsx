import { adminDb } from "@/lib/firebase/admin";
import { SafeAvatar } from "./SafeAvatar";
import Link from "next/link";

export default async function SimilarTasteUsers({ uid, limit = 5 }: { uid: string, limit?: number }) {
  // Fetch source user
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;
  
  const userData = userDoc.data()!;
  const favoriteGenres = userData.preferences?.favoriteGenres || [];

  if (favoriteGenres.length === 0) return null;

  // Simple heuristic: find users with the same top favorite genre.
  // In a real large app, we would cache this daily via cloud function.
  const topGenre = favoriteGenres[0];
  
  // Try to find users who share this genre
  // Firebase doesn't allow "array-contains" with multiple values easily without "array-contains-any",
  // so we'll just use the top genre to find candidates, then filter out the current user.
  const candidatesSnap = await adminDb
    .collection("users")
    .where("preferences.favoriteGenres", "array-contains", topGenre)
    .limit(limit + 5)
    .get();

  const candidates = candidatesSnap.docs
    .map(doc => doc.data())
    .filter(u => u.uid !== uid)
    .slice(0, limit);

  if (candidates.length === 0) return null;

  return (
    <div className="bg-[#101018] border border-white/5 rounded-2xl p-4 sm:p-5 mt-6">
      <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">People with Similar Taste</h3>
      <div className="flex flex-col gap-4">
        {candidates.map(user => (
          <Link href={`/u/${user.username}`} key={user.uid} className="flex items-center gap-3 group">
            <SafeAvatar src={user.photoURL} alt={user.displayName} name={user.displayName} size={40} className="border border-white/5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{user.displayName}</h4>
              <p className="text-[10px] text-zinc-500 uppercase font-black">@{user.username}</p>
            </div>
            <div className="shrink-0 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold uppercase tracking-wider">
              Matches {topGenre}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

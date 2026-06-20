import { adminDb } from "@/lib/firebase/admin";
import RecommendationCard from "./RecommendationCard";
import { Sparkles } from "lucide-react";

export default async function RecommendationsShelf({ uid }: { uid: string }) {
  const snap = await adminDb.collection("users").doc(uid).collection("recommendations").orderBy("createdAt", "desc").limit(10).get();
  
  if (snap.empty) return null;

  const recs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4 px-4 sm:px-0">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-black text-white font-display uppercase tracking-wider">Recommended For You</h2>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0">
        {recs.map((rec) => (
          <div key={rec.id} className="w-[140px] shrink-0">
            <RecommendationCard 
              id={rec.mediaId}
              title={rec.title}
              posterPath={rec.posterPath}
              reason={rec.reason}
              mediaType={rec.mediaType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

import { verifySession } from "@/actions/auth.actions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { WeeklyWrappedSkeleton } from "@/components/skeletons/WeeklyWrappedSkeleton";
import { FeedTimelineSkeleton } from "@/components/skeletons/FeedTimelineSkeleton";
import { FeedTimeline } from "@/components/shared/FeedTimeline";
import { RecommendationsShelf } from "@/components/shared/RecommendationsShelf";
import { RecommendationsShelfSkeleton } from "@/components/skeletons/RecommendationsShelfSkeleton";

const WeeklyWrappedCard = nextDynamic(
  () => import("@/components/shared/WeeklyWrappedCard").then((mod) => mod.WeeklyWrappedCard),
  {
    loading: () => <WeeklyWrappedSkeleton />,
  }
);

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0F0F1A] py-5 pb-10">
      <div className="max-w-[1440px] mx-auto px-3 md:px-4">
        
        {/* Single Flowing Timeline Container */}
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Header */}
          <div className="sticky top-0 z-40 bg-[#0F0F1A]/85 backdrop-blur-md pb-2.5 pt-2.5 border-b border-white/5 flex items-center justify-between select-none">
            <h1 className="text-[20px] font-bold text-white tracking-tight">
              For You
            </h1>
          </div>

          {/* Weekly Wrapped Summary (Client-side, deferred) */}
          <WeeklyWrappedCard />

          {/* Recommendations For You ⭐ */}
          <Suspense fallback={<RecommendationsShelfSkeleton />}>
            <RecommendationsShelf uid={session.uid} />
          </Suspense>

          {/* Feed Timeline content with Suspense streaming */}
          <Suspense fallback={<FeedTimelineSkeleton />}>
            <FeedTimeline uid={session.uid} />
          </Suspense>

        </div>

      </div>
    </div>
  );
}

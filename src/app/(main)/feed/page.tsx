// @ts-nocheck
import { verifySession } from "@/actions/auth.actions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { WeeklyWrappedSkeleton } from "@/components/skeletons/WeeklyWrappedSkeleton";
import { FeedTimelineSkeleton } from "@/components/skeletons/FeedTimelineSkeleton";
import { FeedTimeline } from "@/components/shared/FeedTimeline";
import RecommendationsShelf from "@/components/shared/RecommendationsShelf";
import { RecommendationsShelfSkeleton } from "@/components/skeletons/RecommendationsShelfSkeleton";
import { PageTransition } from "@/components/shared/PageTransition";
import CreatePostBox from "@/components/shared/CreatePostBox";
import { SuggestedUsers } from "@/components/shared/SuggestedUsers";
import { SessionRecovery } from "@/components/shared/SessionRecovery";

const WeeklyWrappedCard = nextDynamic(
  () => import("@/components/shared/WeeklyWrappedCard").then((mod) => mod.WeeklyWrappedCard),
  {
    loading: () => <WeeklyWrappedSkeleton />,
  }
);

export const dynamic = "force-dynamic";

import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function FeedPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <PageTransition>
      <SessionRecovery sessionKey="feed" />
      <PullToRefresh>
        <div className="min-h-screen bg-[#0F0F1A] py-5 pb-10">
          <div className="max-w-[1200px] mx-auto px-3 md:px-4 flex gap-6 items-start justify-center">
            
            {/* Main Timeline Column */}
            <div className="w-full max-w-[600px] shrink-0 space-y-4">
              
              {/* Header */}
              <div className="sticky top-0 z-40 bg-[#0F0F1A]/85 backdrop-blur-md pb-2.5 pt-2.5 border-b border-white/5 flex items-center justify-between select-none">
                <h1 className="text-[20px] font-bold text-white tracking-tight">
                  For You
                </h1>
              </div>

              {/* Quick Thought / Create Post Box */}
              <CreatePostBox />

              {/* Recommendations For You ⭐ */}
              <Suspense fallback={<RecommendationsShelfSkeleton />}>
                <RecommendationsShelf uid={session.id} />
              </Suspense>

              {/* Feed Timeline content with Suspense streaming */}
              <Suspense fallback={<FeedTimelineSkeleton />}>
                <FeedTimeline uid={session.id} />
              </Suspense>

            </div>

            {/* Right Column: Suggested Users & Weekly Wrapped */}
            <div className="hidden lg:block w-80 shrink-0 space-y-6 pt-4 sticky top-4">
              <SuggestedUsers />
              <Suspense fallback={
                <div className="cine-card p-6 min-h-[300px] flex items-center justify-center border-white/5 animate-pulse">
                  <div className="h-8 w-32 bg-white/10 rounded-full" />
                </div>
              }>
                <WeeklyWrappedCard />
              </Suspense>
            </div>
            
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}

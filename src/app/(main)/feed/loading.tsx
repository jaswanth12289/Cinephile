import { FeedTimelineSkeleton } from "@/components/skeletons/FeedTimelineSkeleton";
import { WeeklyWrappedSkeleton } from "@/components/skeletons/WeeklyWrappedSkeleton";
import { RecommendationsShelfSkeleton } from "@/components/skeletons/RecommendationsShelfSkeleton";

export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] py-5 pb-10">
      <div className="max-w-[1440px] mx-auto px-3 md:px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-24 bg-zinc-800/40 rounded animate-pulse" />
          <WeeklyWrappedSkeleton />
          <RecommendationsShelfSkeleton />
          <FeedTimelineSkeleton />
        </div>
      </div>
    </div>
  );
}

import { CarouselSection } from "@/components/shared/CarouselSection";
import { HomeReviewsSkeleton } from "@/components/skeletons/HomeReviewsSkeleton";
import { HomeListsSkeleton } from "@/components/skeletons/HomeListsSkeleton";

export default function DiscoverLoading() {
  return (
    <div className="container mx-auto px-4 py-4 space-y-6 pb-16 max-w-7xl">
      {/* Hero Banner skeleton */}
      <div className="w-full h-[400px] rounded-2xl border border-border/40 bg-card/25 animate-pulse" />
      
      <div className="space-y-8">
        <CarouselSection title="Popular with Cinephiles" data={[]} loading={true} mediaType="movie" iconName="users" />
        <CarouselSection title="Trending Worldwide" data={[]} loading={true} mediaType="movie" iconName="globe" layout="large" />
        <CarouselSection title="Trending TV Shows" data={[]} loading={true} mediaType="tv" iconName="tv" />
        <CarouselSection title="Top Rated This Week" data={[]} loading={true} mediaType="movie" iconName="trophy" />
        <HomeReviewsSkeleton />
        <CarouselSection title="Trending Tollywood" data={[]} loading={true} mediaType="movie" iconName="flame" />
      </div>
    </div>
  );
}

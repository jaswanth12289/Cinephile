import MediaCardSkeleton from "@/components/skeletons/MediaCardSkeleton";

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] py-8 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 space-y-8 animate-pulse">
        {/* Page Header */}
        <div className="space-y-3">
          <div className="h-10 w-36 bg-zinc-800/40 rounded" />
          <div className="h-4 w-96 bg-zinc-800/30 rounded" />
        </div>

        {/* Search Bar Input */}
        <div className="h-14 max-w-2xl bg-zinc-800/20 rounded-2xl border border-white/5" />

        {/* Default shelves skeletons */}
        <div className="space-y-10 pt-4">
          <div className="space-y-4">
            <div className="h-6 w-48 bg-zinc-800/40 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

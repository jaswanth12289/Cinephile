import { getLists } from "@/actions/list.actions";
import { verifySession } from "@/actions/auth.actions";
import Link from "next/link";
import { ListCoverCollage } from "@/components/shared/ListCoverCollage";
import { Heart, MessageSquare, Eye, Plus, Tag, Flame, Clock, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

interface ListsPageProps {
  searchParams: Promise<{
    tag?: string;
  }>;
}

export default async function ListsPage({ searchParams }: ListsPageProps) {
  const { tag } = await searchParams;
  const session = await verifySession();

  // Fetch public lists
  const trendingLists = await getLists("likes", tag);
  const recentLists = await getLists("newest", tag);

  // Extract unique popular tags from lists to display as quick filters
  const allTags = new Set<string>();
  trendingLists.forEach((l) => l.tags?.forEach((t: string) => allTags.add(t)));
  const popularTags = Array.from(allTags).slice(0, 10);

  return (
    <div className="min-h-screen bg-transparent py-8 pb-16 text-white select-none">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        {/* Page Title & Create Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--cine-border)] pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase font-display">
              Cinephile <span className="text-primary">Lists</span>
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1 font-semibold">
              {tag ? `Showing public lists tagged with #${tag}` : "Curated collections, rankings, and watchlists by the community."}
            </p>
          </div>
          {session ? (
            <Link href="/lists/new">
              <Button className="font-extrabold gap-1.5 cursor-pointer uppercase text-xs h-10 px-5 rounded-xl shadow-md shadow-primary/10">
                <Plus className="h-4.5 w-4.5" />
                Create List
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="secondary" className="font-extrabold gap-1.5 cursor-pointer uppercase text-xs h-10 px-5 rounded-xl border border-[var(--cine-border)] hover:bg-white/5">
                Sign in to Create List
              </Button>
            </Link>
          )}
        </div>

        {/* Popular Tags Filters */}
        {popularTags.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Tag className="h-3 w-3" /> Filter by Popular Tag
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/lists"
                className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${
                  !tag 
                    ? "bg-primary/20 text-primary border-primary/40" 
                    : "cine-chip border-white/10"
                }`}
              >
                All Lists
              </Link>
              {popularTags.map((t) => (
                <Link 
                  key={t}
                  href={`/lists?tag=${t}`}
                  className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all hover:scale-[1.02] ${
                    tag === t 
                      ? "bg-primary/20 text-primary border border-primary/40" 
                      : "cine-chip border-white/10"
                  }`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Grid Section */}
        {trendingLists.length === 0 ? (
          <EmptyState
            icon={List}
            title="No lists found"
            description="Build collections worthy of a film festival."
            actionHref={session ? "/lists/new" : "/login"}
            actionText={session ? "Create First List" : "Sign in to Create List"}
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-10 pt-2">
            
            {/* Trending Lists (Ordered by Likes) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--cine-border)] select-none">
                <Flame className="h-4.5 w-4.5 text-amber-500" />
                <h2 className="cine-section-title font-display uppercase tracking-tight">Trending Lists</h2>
              </div>
              <div className="space-y-4">
                {trendingLists.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
            </div>

            {/* Recent Lists */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--cine-border)] select-none">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <h2 className="cine-section-title font-display uppercase tracking-tight">Recent Additions</h2>
              </div>
              <div className="space-y-4">
                {recentLists.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Sub-component: List Card
function ListCard({ list }: { list: any }) {
  const posterPaths = list.featuredItems?.map((i: any) => i.posterPath).filter(Boolean) || [];
  
  return (
    <div className="cine-card cine-card-hover p-4 flex gap-4 shadow-md">
      
      {/* Cover Collage Thumbnail */}
      <Link href={`/list/${list.slug}`} className="w-24 sm:w-28 aspect-[4/3] shrink-0 hover:opacity-85 transition-opacity">
        <ListCoverCollage posterPaths={posterPaths} />
      </Link>

      {/* List Text Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/list/${list.slug}`}>
              <h3 className="text-[16px] font-black uppercase text-white hover:text-primary tracking-wide transition-colors line-clamp-1 font-display">
                {list.title}
              </h3>
            </Link>
            <span className="text-[9px] font-black uppercase bg-primary/10 border border-primary/25 text-primary px-2 py-0.5 rounded-md shrink-0">
              {list.type}
            </span>
          </div>

          <p className="text-[12.5px] text-muted-foreground font-semibold">
            by{" "}
            <Link href={`/user/${list.ownerUsername}`} className="text-gray-300 hover:text-primary transition-colors hover:underline">
              @{list.ownerUsername}
            </Link>
          </p>

          {list.description && (
            <p className="text-[12.5px] text-gray-400 line-clamp-2 leading-relaxed pt-0.5">
              {list.description}
            </p>
          )}

          {list.tags && list.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 select-none max-h-[26px] overflow-hidden">
              {list.tags.slice(0, 3).map((t: string) => (
                <span key={t} className="cine-chip px-2 py-0.5 text-[10px] border-none bg-white/5 hover:bg-white/10 text-gray-300">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Metadata Footer */}
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-3 select-none border-t border-[var(--cine-border)] mt-auto">
          <span>{list.itemsCount} {list.itemsCount === 1 ? "film" : "films"}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 fill-gray-500/10" />
              {list.likesCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {list.commentsCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {list.viewsCount || 0}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

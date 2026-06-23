// @ts-nocheck
import { getLists } from "@/actions/list.actions";
import { verifySession } from "@/actions/auth.actions";
import Link from "next/link";
import { ListCardsSection } from "@/components/shared/ListCardsSection";
import { Plus, Tag, Flame, Clock } from "lucide-react";
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
            icon={<Plus />}
            title="No lists found"
            description="Build collections worthy of a film festival."
            actionHref={session ? "/lists/new" : "/login"}
            actionText={session ? "Create First List" : "Sign in to Create List"}
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-10 pt-2">
            
            {/* Trending Lists (Ordered by Likes) */}
            <ListCardsSection 
              title="Trending Lists"
              lists={trendingLists}
              icon={<Flame />}
            />

            {/* Recent Lists */}
            <ListCardsSection 
              title="Recent Additions"
              lists={recentLists}
              icon={<Clock />}
            />

          </div>
        )}

      </div>
    </div>
  );
}


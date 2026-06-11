import { getListBySlug, getListItems, checkIfUserLikedList, checkIfUserSavedList } from "@/actions/list.actions";
import { verifySession } from "@/actions/auth.actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ListCoverCollage } from "@/components/shared/ListCoverCollage";
import { ListActionBar } from "@/features/lists/ListActionBar";
import { ListItemNote } from "@/features/lists/ListItemNote";
import { CommentSection } from "@/components/shared/CommentSection";
import { 
  Calendar, Clock, Eye, Heart, GitFork, 
  Bookmark, Share2, Star, Shield, Info,
  Unlock, Lock, Link as LinkIcon
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ListDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { slug } = await params;
  const list = await getListBySlug(slug);

  if (!list) notFound();

  // Fetch Items
  const items = await getListItems(list.id);
  const session = await verifySession();

  // Fetch initial social status if authenticated
  let isLiked = false;
  let isSaved = false;
  if (session) {
    isLiked = await checkIfUserLikedList(list.id, session.uid);
    isSaved = await checkIfUserSavedList(list.id, session.uid);
  }

  // Cover backdrop
  const backdrop = list.backdropPath;
  const posterPaths = list.featuredItems?.map((i: any) => i.posterPath).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-transparent pb-16 text-white">
      
      {/* Hero Backdrop Banner */}
      <div className="h-64 md:h-80 w-full relative border-b border-[var(--cine-border)] overflow-hidden select-none bg-[var(--cine-bg)]">
        {backdrop ? (
          <>
            <Image
              src={`https://image.tmdb.org/t/p/w1280${backdrop}`}
              alt={`${list.title} Cover Banner`}
              fill
              priority
              className="object-cover opacity-25 filter blur-[1.5px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--cine-bg)] via-transparent to-black/35" />
          </>
        ) : (
          <>
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.2) 0%, transparent 45%),
                  radial-gradient(circle at 80% 70%, rgba(233, 69, 96, 0.2) 0%, transparent 45%),
                  radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, transparent 40%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E")
                `
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--cine-bg)] via-transparent to-black/20" />
          </>
        )}
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 -mt-20 relative z-10">
        
        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          
          {/* Left Column: Cover Collage & Metadata Stats Sidebar */}
          <div className="space-y-5">
            {/* Cover Collage Box */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-[var(--cine-border)] aspect-[4/3] bg-card backdrop-blur-md">
              <ListCoverCollage posterPaths={posterPaths} />
            </div>

            {/* List Type, Visibility & Pinned badges */}
            <div className="cine-card backdrop-blur-md p-4 space-y-3.5 select-none">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider border-b border-[var(--cine-border)] pb-2 font-display">List Info</h3>
              
              <div className="space-y-2 text-[12.5px] font-bold text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Type:</span>
                  <span className="uppercase text-[10px] bg-primary/10 border border-primary/25 text-primary px-2 py-0.5 rounded font-black tracking-wide">
                    {list.type}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Visibility:</span>
                  <span className="flex items-center gap-1 text-gray-200 text-[11px] font-extrabold capitalize">
                    {list.visibility === "public" && <Unlock className="h-3.5 w-3.5 text-green-400" />}
                    {list.visibility === "unlisted" && <LinkIcon className="h-3.5 w-3.5 text-blue-400" />}
                    {list.visibility === "private" && <Lock className="h-3.5 w-3.5 text-red-400" />}
                    {list.visibility}
                  </span>
                </div>

                {list.isPinned && (
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-gray-400 font-medium">Status:</span>
                    <span className="flex items-center gap-1 text-[11px] font-black uppercase">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      Pinned List
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Curation statistics */}
            <div className="cine-card backdrop-blur-md p-4 space-y-3.5 select-none">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider border-b border-[var(--cine-border)] pb-2 font-display">Stats</h3>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/3 rounded-xl p-2 border border-[var(--cine-border)]">
                  <div className="text-lg font-black text-white">{list.viewsCount || 0}</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wide flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" /> Views
                  </div>
                </div>
                <div className="bg-white/3 rounded-xl p-2 border border-[var(--cine-border)]">
                  <div className="text-lg font-black text-white">{list.savesCount || 0}</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wide flex items-center justify-center gap-1">
                    <Bookmark className="h-3 w-3" /> Saves
                  </div>
                </div>
                <div className="bg-white/3 rounded-xl p-2 border border-[var(--cine-border)]">
                  <div className="text-lg font-black text-white">{list.forksCount || 0}</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wide flex items-center justify-center gap-1">
                    <GitFork className="h-3 w-3" /> Forks
                  </div>
                </div>
                <div className="bg-white/3 rounded-xl p-2 border border-[var(--cine-border)]">
                  <div className="text-lg font-black text-white">{list.shareCount || 0}</div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wide flex items-center justify-center gap-1">
                    <Share2 className="h-3 w-3" /> Shares
                  </div>
                </div>
              </div>

              {list.estimatedWatchTimeHours > 0 && (
                <div className="pt-2 text-center text-[12px] font-bold text-gray-400 border-t border-[var(--cine-border)] flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Estimated Watch Time: </span>
                  <span className="text-white font-extrabold">{list.estimatedWatchTimeHours} hrs</span>
                </div>
              )}
            </div>

            {/* List Tags */}
            {list.tags && list.tags.length > 0 && (
              <div className="cine-card backdrop-blur-md p-4 space-y-2.5">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {list.tags.map((tag: string) => (
                    <Link 
                      key={tag} 
                      href={`/lists?tag=${tag}`} 
                      className="cine-chip text-primary bg-primary/10 border-primary/20 select-none"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Dates info */}
            <div suppressHydrationWarning className="text-[11px] text-muted-foreground font-semibold space-y-1 pl-1 select-none">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created {new Date(list.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span>Last updated {new Date(list.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Title, Description, Cards & Actions */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Header info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight font-display">
                  {list.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-gray-300 select-none">
                  <span>by</span>
                  {list.ownerPhoto ? (
                    <Image
                      src={list.ownerPhoto}
                      alt={list.ownerName}
                      width={22}
                      height={22}
                      className="h-5.5 w-5.5 rounded-full object-cover border border-[var(--cine-border)]"
                    />
                  ) : (
                    <div className="h-5.5 w-5.5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-bold">
                      {list.ownerName[0]?.toUpperCase()}
                    </div>
                  )}
                  <Link href={`/user/${list.ownerUsername}`} className="font-extrabold text-white hover:underline">
                    @{list.ownerUsername}
                  </Link>
                  <span className="text-muted-foreground">({list.ownerName})</span>
                  
                  {/* Fork metadata */}
                  {list.forkedFrom && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1 text-gray-400 font-medium text-[12.5px]">
                        <GitFork className="h-3.5 w-3.5 text-primary" />
                        <span>forked from </span>
                        <Link href={`/user/${list.forkedFrom.ownerUsername}`} className="font-bold hover:underline text-gray-300">
                          @{list.forkedFrom.ownerUsername}
                        </Link>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {list.description && (
                <p className="text-[14.5px] leading-relaxed text-gray-200 whitespace-pre-wrap break-words select-text">
                  {list.description}
                </p>
              )}

              {/* Collaborators snapshot footer */}
              {list.collaborators && list.collaborators.length > 0 && (
                <div className="flex items-center gap-2.5 pt-1.5 select-none border-t border-[var(--cine-border)]">
                  <span className="text-[12px] font-black uppercase text-muted-foreground">Collaborators:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {list.collaborators.map((c: any) => (
                      <div key={c.uid} className="flex items-center gap-1 text-[12px] font-bold text-gray-300 bg-white/5 px-2.5 py-1 rounded-full border border-[var(--cine-border)]">
                        {c.photoURL ? (
                          <Image
                            src={c.photoURL}
                            alt={c.displayName}
                            width={18}
                            height={18}
                            className="h-4.5 w-4.5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-bold">
                            {c.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                        <Link href={`/user/${c.username}`} className="hover:underline">@{c.username}</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List Action Buttons Toolbar */}
            <ListActionBar
              listId={list.id}
              ownerId={list.ownerId}
              collaborators={list.collaborators || []}
              initialLikesCount={list.likesCount || 0}
              initialSavesCount={list.savesCount || 0}
              initialForksCount={list.forksCount || 0}
              initialShareCount={list.shareCount || 0}
              initialIsLiked={isLiked}
              initialIsSaved={isSaved}
              editUrl={`/list/${list.slug}/edit`}
            />

            {/* List Items Shelf */}
            <div className="space-y-4">
              <h2 className="text-[15px] font-black tracking-wider text-muted-foreground uppercase border-b border-[var(--cine-border)] pb-2 select-none font-display">
                List Titles ({items.length})
              </h2>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div 
                    key={item.id}
                    className="cine-card cine-card-hover p-4 flex gap-4"
                  >
                    {/* Rank index */}
                    <div className="flex flex-col items-center justify-center font-black text-xl text-muted-foreground select-none shrink-0 w-8">
                      {list.type === "ranking" ? `#${index + 1}` : "•"}
                    </div>

                    {/* Poster */}
                    {item.posterPath ? (
                      <Link 
                        href={`/${item.mediaType}/${item.tmdbId}`}
                        className="relative h-20 aspect-[2/3] rounded-lg overflow-hidden bg-muted/20 border border-[var(--cine-border)] shrink-0 hover:scale-102 transition-transform shadow"
                      >
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                          alt={item.title}
                          fill
                          sizes="60px"
                          className="object-cover"
                        />
                      </Link>
                    ) : (
                      <div className="h-20 aspect-[2/3] rounded bg-white/5 border border-[var(--cine-border)] shrink-0 flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase select-none">
                        No Poster
                      </div>
                    )}

                    {/* Meta & Notes */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/${item.mediaType}/${item.tmdbId}`}>
                          <h4 className="text-[15px] font-black text-white hover:text-primary transition-colors leading-tight uppercase tracking-wide truncate font-display">
                            {item.title}
                          </h4>
                        </Link>
                        <span className="text-[9px] font-black uppercase bg-white/5 border border-[var(--cine-border)] text-gray-400 px-2 py-0.5 rounded-md select-none">
                          {item.mediaType}
                        </span>
                      </div>
                      
                      <p className="text-[12px] text-muted-foreground font-semibold mt-0.5 select-none">
                        {item.releaseYear}
                      </p>

                      {/* Notes caption */}
                      {item.note && (
                        <ListItemNote 
                          note={item.note} 
                          listContainsSpoilers={list.containsSpoilers} 
                        />
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Comments Board Card */}
            <div className="cine-card p-4 space-y-4">
              <h2 className="text-[15px] font-black tracking-wider text-muted-foreground uppercase border-b border-[var(--cine-border)] pb-2 select-none font-display">
                Discussion
              </h2>
              <CommentSection
                targetId={list.id}
                type="list"
                initialCommentsCount={list.commentsCount || 0}
              />
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

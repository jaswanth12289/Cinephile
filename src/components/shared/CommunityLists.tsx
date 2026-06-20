import Link from "next/link";
import Image from "next/image";
import { List, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminDb } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/withTimeout";
import { SafeImage } from "./SafeImage";

interface ListItem {
  id: string;
  title: string;
  count: number;
  likes: number;
  userName: string;
  posters: string[];
  slug: string;
}

const mockLists: ListItem[] = [
  {
    id: "l1",
    title: "Malayalam New Wave Essentials",
    count: 18,
    likes: 124,
    userName: "Anjali ML",
    posters: ["/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg", "/czemb574OI8K1QJ5545tQ6BfHth.jpg", "/gEU2QvEOmfcFgawjJySy67J4nUI.jpg"],
    slug: "malayalam-new-wave-essentials",
  },
  {
    id: "l2",
    title: "Mind-Bending Sci-Fi Masterpieces",
    count: 25,
    likes: 98,
    userName: "NolanFan99",
    posters: ["/gEU2QvEOmfcFgawjJySy67J4nUI.jpg", "/czemb574OI8K1QJ5545tQ6BfHth.jpg", "/8Gxv2Z7HqD6hwN0jRcZ6kyiW7zS.jpg"],
    slug: "mind-bending-sci-fi-masterpieces",
  },
  {
    id: "l3",
    title: "Tollywood Blockbusters of the Decade",
    count: 32,
    likes: 145,
    userName: "RajamouliDevotee",
    posters: ["/wdrCwjR5x5NmFY5rwv45zpbz7C8.jpg", "/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg", "/gEU2QvEOmfcFgawjJySy67J4nUI.jpg"],
    slug: "tollywood-blockbusters-of-the-decade",
  }
];

export async function CommunityLists() {
  let lists: ListItem[] = [];

  try {
    const snap = await withTimeout(
      adminDb
        .collection("lists")
        .where("visibility", "==", "public")
        .limit(3)
        .get(),
      5000
    );

    lists = snap.docs.map((doc) => {
      const data = doc.data();
      const firstThreePosters = (data.posterIds || []).slice(0, 3);
      // Ensure we fill up to 3 posters if available
      while (firstThreePosters.length < 3 && firstThreePosters.length > 0) {
        firstThreePosters.push(firstThreePosters[0]);
      }

      return {
        id: doc.id,
        title: data.title,
        count: data.itemsCount || 0,
        likes: data.likesCount || 0,
        userName: data.lastEditedBy?.username ? `@${data.lastEditedBy.username}` : "cinephile",
        posters: firstThreePosters,
        slug: data.slug || doc.id,
      };
    });

    lists.sort((a, b) => b.likes - a.likes);
  } catch (err) {
    console.warn("[CommunityLists] Error loading lists:", err);
  }

  const activeLists = lists.length > 0 ? lists : mockLists;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <h2 className="text-2xl font-bold tracking-widest uppercase text-white border-l-4 border-primary pl-4">
          Curated Lists
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeLists.map((list, listIdx) => (
          <Link href={`/list/${list.slug}`} key={list.id} className="block">
            <Card className="relative border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl hover:border-border/60 hover:bg-card/40 transition-all duration-300 group cursor-pointer h-28">
              <CardContent className="p-3 flex flex-col justify-between h-full relative z-10">
                {/* Stacked posters layout */}
                <div className="flex items-center pl-2 relative h-12">
                  {list.posters.map((poster, idx) => (
                    <div
                      key={`${list.id}-poster-${idx}`}
                      className="relative h-12 aspect-[2/3] rounded-md overflow-hidden border border-black/50 shadow-xl -ml-2 transition-transform group-hover:translate-x-1.5 duration-200"
                      style={{ zIndex: 10 - idx }}
                    >
                      <SafeImage
                        src={poster.startsWith("http") || poster.startsWith("/placeholder") ? poster : `https://image.tmdb.org/t/p/w185${poster}`}
                        alt="List Poster"
                        fill
                        sizes="40px"
                        className="object-cover"
                        fallbackSrc="/placeholder-poster.svg"
                      />
                    </div>
                  ))}
                  
                  <div className="flex-1 pl-4 flex flex-col justify-center min-w-0">
                    <h4 className="text-xs font-black text-white group-hover:text-primary transition-colors line-clamp-1">
                      {list.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      by {list.userName}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 mt-1 border-t border-white/5">
                  <span className="font-extrabold uppercase">{list.count} films</span>
                  <span className="flex items-center gap-1 font-extrabold text-gray-300">
                    <Heart className="h-3.5 w-3.5 fill-primary/10 text-primary" />
                    {list.likes} likes
                  </span>
                </div>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

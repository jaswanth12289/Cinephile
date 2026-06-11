import Link from "next/link";
import { Film, Compass, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center p-4 text-white select-none">
      <div className="max-w-md w-full bg-card/25 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl flex flex-col items-center">
        {/* Animated icon or movie reel */}
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner animate-pulse">
          <Film className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            404 - Lost in Translation
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight pt-1">
            Scene Not Found
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            The page, movie curation list, or user profile you are looking for has been cut from the final edit or never existed.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full pt-2">
          <Link href="/feed" className="w-full">
            <Button className="w-full font-extrabold uppercase text-xs h-10 rounded-xl shadow-lg shadow-primary/20 gap-1.5 cursor-pointer">
              <Compass className="h-4 w-4" />
              Go to Feed
            </Button>
          </Link>
          <Link href="/search" className="w-full">
            <Button variant="ghost" className="w-full font-extrabold uppercase text-xs h-10 rounded-xl border border-white/5 hover:bg-white/5 gap-1.5 cursor-pointer text-gray-300">
              <ChevronLeft className="h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

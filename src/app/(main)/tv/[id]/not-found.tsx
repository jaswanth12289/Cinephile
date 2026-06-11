import Link from "next/link";
import { Tv } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TVNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-white select-none">
      <div className="max-w-md w-full bg-card/25 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <Tv className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight pt-1">
            🎬 Content not found
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            This TV show page may have been removed.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full pt-2">
          <Link href="/" className="w-full">
            <Button className="w-full font-extrabold uppercase text-xs h-10 rounded-xl shadow-lg shadow-primary/20 gap-1.5 cursor-pointer">
              Back Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

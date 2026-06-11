import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film } from "lucide-react";

export default function MovieNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center select-none font-display">
      <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
        <Film className="h-10 w-10 animate-bounce" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
        🎬 Content Not Found
      </h2>
      <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
        This film details page may have been removed, or the movie ID is invalid.
      </p>
      <Link href="/" passHref>
        <Button className="font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-xl shadow-md">
          Back Home
        </Button>
      </Link>
    </div>
  );
}

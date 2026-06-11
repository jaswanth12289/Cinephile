import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { List } from "lucide-react";

export function HomeListsSkeleton() {
  return (
    <section className="space-y-3 select-none">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <List className="h-4 w-4 text-muted-foreground animate-pulse" />
        <h2 className="text-lg font-black tracking-tight text-white uppercase animate-pulse">
          Curated Lists
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} className="border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl h-28 animate-pulse">
            <CardContent className="p-3 flex flex-col justify-between h-full">
              {/* Stacked posters layout placeholder */}
              <div className="flex items-center pl-2 relative h-12">
                {/* 3 overlapping poster placeholders */}
                <div className="relative h-12 aspect-[2/3] rounded-md bg-muted/20 border border-black/50 shadow-xl" />
                <div className="relative h-12 aspect-[2/3] rounded-md bg-muted/15 border border-black/50 shadow-xl -ml-2" />
                <div className="relative h-12 aspect-[2/3] rounded-md bg-muted/10 border border-black/50 shadow-xl -ml-2" />
                
                {/* Title and owner placeholder */}
                <div className="flex-1 pl-4 flex flex-col justify-center min-w-0 space-y-2">
                  <div className="h-3.5 w-3/4 bg-muted/40 rounded" />
                  <div className="h-3 w-1/2 bg-muted/25 rounded" />
                </div>
              </div>

              {/* Stats placeholder */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                <div className="h-3 w-12 bg-muted/30 rounded" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export function HomeReviewsSkeleton() {
  return (
    <section className="space-y-3 select-none">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground animate-pulse" />
        <h2 className="text-lg font-black tracking-tight text-white uppercase animate-pulse">
          Popular Reviews
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} className="border-border/30 bg-card/25 backdrop-blur-md overflow-hidden rounded-xl animate-pulse">
            <CardContent className="p-4 flex gap-4">
              {/* Poster Thumbnail Placeholder */}
              <div className="h-20 aspect-[2/3] rounded bg-muted/20 border border-border/20 shadow-md shrink-0" />

              {/* Review Content Placeholder */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3.5 w-16 bg-muted/30 rounded" />
                    <div className="h-3 w-16 bg-muted/20 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-muted/45 rounded" />
                  <div className="space-y-1">
                    <div className="h-3 w-full bg-muted/20 rounded" />
                    <div className="h-3 w-5/6 bg-muted/20 rounded" />
                  </div>
                </div>

                <div className="h-3 w-12 bg-muted/35 rounded mt-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

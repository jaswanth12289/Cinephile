"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDensity } from "@/components/providers/DensityProvider";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionText,
  onActionClick,
}: EmptyStateProps) {
  const { density } = useDensity();
  const isCompact = density === "compact";

  return (
    <div 
      className={cn(
        "bg-card/20 backdrop-blur-md rounded-2xl border border-border/20 text-center shadow-lg select-none mx-auto flex flex-col items-center",
        isCompact 
          ? "p-5 sm:p-6 my-2.5 space-y-3 max-w-sm" 
          : "p-8 md:p-12 my-6 space-y-4 max-w-md"
      )}
    >
      <div 
        className={cn(
          "rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0",
          isCompact ? "w-9 h-9 [&>svg]:w-4.5 [&>svg]:h-4.5" : "w-12 h-12 [&>svg]:w-6 [&>svg]:h-6"
        )}
      >
        {icon}
      </div>
      
      <div className="space-y-1">
        <h3 
          className={cn(
            "font-black text-white uppercase tracking-wide",
            isCompact ? "text-sm sm:text-base" : "text-[17px]"
          )}
        >
          {title}
        </h3>
        <p 
          className={cn(
            "leading-relaxed text-muted-foreground",
            isCompact ? "text-[11.5px]" : "text-[13.5px]"
          )}
        >
          {description}
        </p>
      </div>

      {(actionHref || onActionClick) && (
        <div className={isCompact ? "pt-1" : "pt-2"}>
          {actionHref ? (
            <Link href={actionHref}>
              <Button 
                className={cn(
                  "font-extrabold uppercase shadow-lg shadow-primary/15 hover:scale-102 transition-transform cursor-pointer",
                  isCompact ? "text-[10px] h-8 px-4 rounded-lg" : "text-xs h-9 px-5 rounded-xl"
                )}
              >
                {actionText || "Get Started"}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={onActionClick}
              className={cn(
                "font-extrabold uppercase shadow-lg shadow-primary/15 hover:scale-102 transition-transform cursor-pointer",
                isCompact ? "text-[10px] h-8 px-4 rounded-lg" : "text-xs h-9 px-5 rounded-xl"
              )}
            >
              {actionText || "Get Started"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


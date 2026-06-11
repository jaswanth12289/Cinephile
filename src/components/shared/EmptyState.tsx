import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionText,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="p-8 md:p-12 bg-card/20 backdrop-blur-md rounded-2xl border border-border/20 text-center space-y-4 shadow-lg select-none max-w-md mx-auto my-6 flex flex-col items-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      
      <div className="space-y-1.5">
        <h3 className="text-[17px] font-black text-white uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {(actionHref || onActionClick) && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button className="font-extrabold uppercase text-xs h-9 px-5 rounded-xl shadow-lg shadow-primary/15 hover:scale-102 transition-transform cursor-pointer">
                {actionText || "Get Started"}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={onActionClick}
              className="font-extrabold uppercase text-xs h-9 px-5 rounded-xl shadow-lg shadow-primary/15 hover:scale-102 transition-transform cursor-pointer"
            >
              {actionText || "Get Started"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

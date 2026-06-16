"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSectionProps {
  title: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableSection({
  title,
  icon: Icon,
  actionLabel,
  actionHref,
  onActionClick,
  children,
  className,
}: ExpandableSectionProps) {
  return (
    <section className={cn("space-y-3.5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 select-none">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4.5 w-4.5 text-primary" />}
          <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase font-display">
            {title}
          </h2>
        </div>
        
        {actionLabel && (
          <>
            {actionHref ? (
              <Link
                href={actionHref}
                className="text-[10px] sm:text-xs font-black text-primary hover:underline uppercase tracking-wider transition-colors cursor-pointer"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                onClick={onActionClick}
                className="text-[10px] sm:text-xs font-black text-primary hover:underline uppercase tracking-wider transition-colors cursor-pointer"
              >
                {actionLabel}
              </button>
            )}
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="w-full">
        {children}
      </div>
    </section>
  );
}

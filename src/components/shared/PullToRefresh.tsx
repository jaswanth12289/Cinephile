"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  // Sync state with Next.js page transition
  useEffect(() => {
    if (!isPending && isRefreshing) {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isPending, isRefreshing]);

  const handleTouchStart = (e: TouchEvent) => {
    if (isPending || isRefreshing) return;
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current || isPending || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && window.scrollY === 0) {
      // Prevent browser default pull-to-refresh overscroll behaviour
      if (e.cancelable) {
        e.preventDefault();
      }
      const pull = Math.min(diff * 0.4, MAX_PULL);
      setPullDistance(pull);
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing && !isPending) {
      setIsRefreshing(true);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, isPending]);

  return (
    <div ref={containerRef} className="relative min-h-full">
      {/* Pull indicator */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px) translateX(-50%)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          transition: isPulling.current ? "none" : "transform 0.2s ease-out, opacity 0.15s",
        }}
        className="absolute left-1/2 -top-10 z-50 flex items-center justify-center bg-[#101018] border border-white/10 rounded-full p-2.5 shadow-2xl pointer-events-none"
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-primary",
            isRefreshing ? "animate-spin" : ""
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${pullDistance * 3.5}deg)`,
          }}
        />
      </div>

      {/* Viewport container */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 55 : pullDistance * 0.7}px)`,
          transition: isPulling.current ? "none" : "transform 0.2s ease-out",
        }}
        className="will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}

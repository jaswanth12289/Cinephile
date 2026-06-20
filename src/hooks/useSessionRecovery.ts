"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useSessionRecovery(key: string) {
  const pathname = usePathname();
  const isRecovering = useRef(true);

  useEffect(() => {
    // 1. On mount, try to restore
    if (isRecovering.current) {
      const savedPos = sessionStorage.getItem(`scroll_${key}_${pathname}`);
      if (savedPos) {
        // Use a short timeout to let Next.js render layout shifts
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedPos, 10),
            behavior: "instant"
          });
        }, 50);
      }
      isRecovering.current = false;
    }

    // 2. Track scrolling
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        sessionStorage.setItem(`scroll_${key}_${pathname}`, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [key, pathname]);
}

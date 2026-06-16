"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

interface PageLoadMeasureProps {
  pageName: string;
  id?: string;
}

export function PageLoadMeasure({ pageName, id }: PageLoadMeasureProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.performance) return;

    // performance.now() measures the time elapsed since the navigation start/page initialization
    const loadTime = Math.round(performance.now());
    
    trackEvent("performance_metric", {
      metricName: `${pageName}_load_time`,
      durationMs: loadTime,
      id: id || null,
    });
  }, [pageName, id]);

  return null;
}
export default PageLoadMeasure;

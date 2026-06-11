import { logger } from "./logger";

type EventName =
  | "page_view"
  | "movie_opened"
  | "review_created"
  | "follow_user"
  | "list_created"
  | "recommendation_clicked"
  | "search_performed";

interface EventParams {
  [key: string]: any;
}

/**
 * Tracks an event in a provider-agnostic manner.
 * Components must invoke this directly instead of importing raw tracking modules.
 */
export function trackEvent(name: EventName, params?: EventParams) {
  try {
    logger.info(`[Analytics] event logged: "${name}"`, params);
    
    // Abstracted hooks for production engines (Firebase Analytics, Mixpanel, etc.)
    if (typeof window !== "undefined") {
      // Example integration with Google Analytics (gtag)
      const w = window as any;
      if (w.gtag) {
        w.gtag("event", name, params);
      }
    }
  } catch (err) {
    logger.error("[Analytics] Tracking call failed:", err);
  }
}

import { logger } from "./logger";

export type EventName =
  | "page_view"
  | "movie_opened"
  | "review_created"
  | "follow_user"
  | "list_created"
  | "recommendation_clicked"
  | "search_performed"
  | "route_error"
  | "tmdb_failure"
  | "auth_failure"
  | "image_failure";

export type Severity = "warning" | "error" | "critical";

const DEFAULT_SEVERITIES: Record<EventName, Severity> = {
  page_view: "warning", // Default informational events categorized safely as warning for crashlytics logging
  movie_opened: "warning",
  review_created: "warning",
  follow_user: "warning",
  list_created: "warning",
  recommendation_clicked: "warning",
  search_performed: "warning",
  image_failure: "warning",
  tmdb_failure: "error",
  auth_failure: "critical",
  route_error: "critical",
};

interface EventParams {
  [key: string]: any;
}

/**
 * Tracks an event in a provider-agnostic manner.
 * Components must invoke this directly instead of importing raw tracking modules.
 */
export function trackEvent(name: EventName, params?: EventParams, severity?: Severity) {
  try {
    const finalSeverity = severity || DEFAULT_SEVERITIES[name] || "warning";
    logger.info(`[Analytics] event logged: "${name}" [Severity: ${finalSeverity}]`, params);
    
    // Abstracted hooks for production engines (Firebase Analytics, Mixpanel, Crashlytics, etc.)
    if (typeof window !== "undefined") {
      // Example integration with Google Analytics (gtag)
      const w = window as any;
      if (w.gtag) {
        w.gtag("event", name, {
          ...params,
          severity: finalSeverity,
        });
      }
      
      // Integration hook for Sentry/Crashlytics in the future
      if (finalSeverity === "critical") {
        logger.warn(`[Crashlytics/Telemetry] Critical failure reported: "${name}"`, params);
      }
    }
  } catch (err) {
    logger.error("[Analytics] Tracking call failed:", err);
  }
}

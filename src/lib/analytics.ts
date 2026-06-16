import { logger } from "./logger";
import { logTelemetryAction } from "@/actions/telemetry.actions";

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
  | "image_failure"
  | "performance_metric";

export type Severity = "warning" | "error" | "critical";

const DEFAULT_SEVERITIES: Record<EventName, Severity> = {
  page_view: "warning",
  movie_opened: "warning",
  review_created: "warning",
  follow_user: "warning",
  list_created: "warning",
  recommendation_clicked: "warning",
  search_performed: "warning",
  image_failure: "warning",
  performance_metric: "warning",
  tmdb_failure: "error",
  auth_failure: "critical",
  route_error: "critical",
};

interface EventParams {
  [key: string]: any;
}

/**
 * Tracks an event in a provider-agnostic manner.
 * Logs failures and performance telemetry to Firebase database via server action.
 */
export function trackEvent(name: EventName, params?: EventParams, severity?: Severity) {
  try {
    const finalSeverity = severity || DEFAULT_SEVERITIES[name] || "warning";
    logger.info(`[Analytics] event logged: "${name}" [Severity: ${finalSeverity}]`, params);
    
    // Server-side crashlytics & telemetry report
    if (
      finalSeverity === "critical" ||
      finalSeverity === "error" ||
      name === "performance_metric" ||
      name === "route_error" ||
      name === "tmdb_failure" ||
      name === "auth_failure"
    ) {
      logTelemetryAction(name, params || {}, finalSeverity).catch(() => {});
    }

    // Abstracted hooks for production WebView / client integrations
    if (typeof window !== "undefined") {
      const w = window as any;
      if (w.gtag) {
        w.gtag("event", name, {
          ...params,
          severity: finalSeverity,
        });
      }
      
      if (finalSeverity === "critical") {
        logger.warn(`[Crashlytics/Telemetry] Critical failure reported: "${name}"`, params);
      }
    }
  } catch (err) {
    logger.error("[Analytics] Tracking call failed:", err);
  }
}

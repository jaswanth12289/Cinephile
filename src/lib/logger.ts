// Centralized logging system for Cinephile

export const logger = {
  info: (message: string, ...optionalParams: any[]) => {
    console.log(`[INFO] ${message}`, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: any[]) => {
    console.warn(`[WARN] ${message}`, ...optionalParams);
  },
  error: (message: string, error?: any, ...optionalParams: any[]) => {
    console.error(`[ERROR] ${message}`, error, ...optionalParams);
    // Integration point for error monitoring tools (like Sentry, LogRocket, or Datadog)
  }
};

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: { timeoutMs?: number; retries?: number; fallbackData?: T } = {}
): Promise<{ data: T | null; error: any; success: boolean }> {
  const timeoutMs = options.timeoutMs ?? 5000;
  let retries = options.retries ?? 1;

  while (retries >= 0) {
    try {
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
        setTimeout(() => reject(new Error("Database query timed out")), timeoutMs);
      });

      // Race the actual query against the timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);

      if (result.error) {
        throw result.error;
      }

      return { data: result.data, error: null, success: true };
    } catch (error: any) {
      console.warn(`[safeQuery] Query failed. Retries left: ${retries}`, error);
      if (retries === 0) {
        return {
          data: options.fallbackData ?? null,
          error: error.message || error,
          success: false,
        };
      }
      retries--;
    }
  }

  // Should theoretically never reach here
  return { data: options.fallbackData ?? null, error: "Unknown error", success: false };
}

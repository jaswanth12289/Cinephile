/**
 * Protects async operations (e.g. Firestore queries) from hanging by racing them against a timeout.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000, fallbackValue?: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error("Operation timed out"));
      }
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }).catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    }),
    timeoutPromise
  ]);
}

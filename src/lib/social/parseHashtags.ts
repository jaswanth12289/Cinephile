/**
 * Extracts hashtags from a given text.
 * e.g., "Hello #SciFi #Drama" -> ["SciFi", "Drama"]
 */
export function parseHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  
  // Remove the # and get unique lowercase versions for clean data,
  // but we can preserve original casing by picking the first match.
  const tags = matches.map((t) => t.slice(1));
  return Array.from(new Set(tags));
}

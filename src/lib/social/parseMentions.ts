import { createServiceClient } from "@/lib/supabase/server";

/**
 * Extracts mentions from text and verifies them against the database.
 * Returns an array of valid { userId, username } objects.
 */
export async function parseMentions(text: string): Promise<{ userId: string; username: string }[]> {
  if (!text) return [];
  
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  
  const usernames = Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
  const validMentions: { userId: string; username: string }[] = [];

  // Note: For extreme scalability, we might want to do batch lookups if the list is huge.
  // We can do an "in" query up to 10 items.
  for (let i = 0; i < usernames.length; i += 10) {
    const batch = usernames.slice(i, i + 10);
    const supabase = createServiceClient();
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", batch);
      
      (data || []).forEach((doc: any) => {
        validMentions.push({
          userId: doc.id,
          username: doc.username
        });
      });
    } catch (e) {
      console.warn("Failed to lookup mentions batch:", e);
    }
  }

  return validMentions;
}

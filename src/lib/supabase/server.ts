/**
 * Supabase server client — used in Server Components, Server Actions, and API Routes.
 * Uses @supabase/ssr to read/write cookies, keeping the session in sync.
 *
 * IMPORTANT: Call createClient() inside each server action / component.
 * Do NOT share a client instance across requests.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — cookies cannot be mutated.
            // This is safe to ignore; the middleware handles session refresh.
          }
        },
      },
    }
  );
}

/**
 * Service-role client for privileged server-side operations (badge engine,
 * notification writes, data migration script).
 * NEVER expose SUPABASE_SECRET_KEY to the browser.
 */
export function createServiceClient() {
  // Import inline to keep this module safe from accidental client-side bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: _createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}


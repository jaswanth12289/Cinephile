import { NextResponse } from "next/server";

/**
 * Session management is handled entirely by Supabase SSR middleware.
 * This route only handles explicit sign-out (DELETE).
 *
 * Supabase sets/clears its own session cookies automatically — no manual
 * cookie creation needed (unlike the old session cookie pattern).
 */

export async function DELETE() {
  const response = NextResponse.json({ status: "success" });
  // Clear all Supabase session cookies
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");
  return response;
}

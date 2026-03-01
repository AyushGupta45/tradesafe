// Server-side auth helper for API routes
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the authenticated user from the current request.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}

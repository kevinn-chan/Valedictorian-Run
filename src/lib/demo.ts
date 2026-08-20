import { createClient } from "@supabase/supabase-js";

// The single session served publicly (read-only) at /demo. Point it at a
// compiled session whose contents are safe to show the world.
// On the live deploy it defaults to the sample course; self-hosters set the env.
export const DEMO_SESSION_ID =
  process.env.DEMO_SESSION_ID ?? "10d0489e-3c24-4a80-b56b-8a519177c3a1";

// Service-role reader: the demo intentionally bypasses RLS to serve one public
// session to anonymous visitors. Server-only — never import into a client file.
export function demoReader() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

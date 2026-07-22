import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/profiles";

// Shared-password sign-in: a profile click submits the profile's index + the
// shared password. We resolve the index to an email server-side so real emails
// never appear in the login HTML. Knowing the URL is no longer enough — without
// the password there is no session.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const raw = form.get("profile");
  const idx = raw === null ? -1 : Number(raw);
  const password = String(form.get("password") ?? "");

  const profile = getProfiles()[idx];
  if (!profile) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}

"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type SignInWithMagicLinkResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Resolve the site origin for magic link redirect. Prefer request host so
 * production always redirects back to the actual domain (not localhost).
 */
async function getRedirectOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto === "https" ? "https" : "http"}://${host}`;
  } catch {
    // headers() can throw in some edge/static contexts
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof process.env.VERCEL_URL === "string"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

/**
 * Send magic link to email. Call from login page.
 * Redirect URL points to /auth/callback?next=/dashboard on the same origin as the request.
 */
export async function signInWithMagicLink(
  email: string
): Promise<SignInWithMagicLinkResult> {
  const supabase = await createClient();
  const origin = await getRedirectOrigin();
  const redirectTo = `${origin}/auth/callback?next=/dashboard`;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "Check your email for the sign-in link.",
  };
}

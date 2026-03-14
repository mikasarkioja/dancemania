"use server";

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
 * Send magic link to email. Call from login page.
 * Redirect URL should point to /auth/callback?next=/dashboard
 */
export async function signInWithMagicLink(
  email: string
): Promise<SignInWithMagicLinkResult> {
  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof process.env.VERCEL_URL === "string"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
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

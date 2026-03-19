"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SendLoginOtpResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type VerifyLoginOtpResult = { ok: true } | { ok: false; error: string };

/**
 * Send a one-time password to the given email.
 * Sentinel: shouldCreateUser true so the same flow works for both login and signup.
 * Uses Supabase Email OTP; ensure your project has Email OTP enabled (Auth > Providers > Email).
 */
export async function sendLoginOtp(email: string): Promise<SendLoginOtpResult> {
  const supabase = await createClient();
  const trimmed = email.trim();

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "Check your email for the 6-digit code.",
  };
}

/**
 * Verify the OTP and establish the session.
 * Session cookies are set via createClient() setAll when verifyOtp succeeds.
 * Caller should redirect to /dashboard on success (cookies are committed in the action response).
 */
export async function verifyLoginOtp(
  email: string,
  token: string
): Promise<VerifyLoginOtpResult> {
  const supabase = await createClient();
  const trimmedEmail = email.trim();
  const trimmedToken = token.replace(/\s/g, "");

  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: "email",
  });

  if (error) {
    if (
      error.message?.toLowerCase().includes("expired") ||
      error.message?.toLowerCase().includes("invalid")
    ) {
      return {
        ok: false,
        error: "The sentinel could not verify this code. Please try again.",
      };
    }
    if (
      error.message?.toLowerCase().includes("rate") ||
      error.message?.toLowerCase().includes("wait")
    ) {
      return {
        ok: false,
        error: "Please wait a moment before requesting a new code.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Sign out and redirect to home.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

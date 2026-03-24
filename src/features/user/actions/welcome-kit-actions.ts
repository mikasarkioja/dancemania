"use server";

/**
 * Welcome Kit: first-run overlay for test users.
 * Guardian: all operations scoped to auth.uid(). Admin/Teacher skip the kit.
 */

import { createClient } from "@/lib/supabase/server";

export interface WelcomeKitStatus {
  shouldShow: boolean;
}

async function saveWelcomeKitState(payload: {
  has_seen_welcome_kit: boolean;
  privacy_consent_granted?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const writePayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  // Prefer UPDATE when a row exists — avoids PostgREST upsert edge cases with RLS.
  const { data: updatedRows, error: updateError } = await supabase
    .from("profiles")
    .update(writePayload)
    .eq("id", user.id)
    .select("id");

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (updatedRows && updatedRows.length > 0) {
    return { success: true };
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    ...writePayload,
  });

  if (insertError) {
    return {
      success: false,
      error: insertError.message,
    };
  }

  return { success: true };
}

/**
 * Whether to show the Welcome Kit overlay.
 * Skip if user is Admin or Teacher, or has already seen the kit.
 */
export async function getWelcomeKitStatus(): Promise<WelcomeKitStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { shouldShow: false };
  }

  const role = (user.app_metadata?.role as string) ?? "";
  if (role === "admin" || role === "teacher") {
    return { shouldShow: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_seen_welcome_kit")
    .eq("id", user.id)
    .single();

  const hasSeen = profile?.has_seen_welcome_kit === true;
  return { shouldShow: !hasSeen };
}

/**
 * Mark Welcome Kit complete and grant privacy consent (Enter the Studio).
 * Guardian: only the profile for auth.uid() is updated.
 */
export async function completeWelcomeKit(): Promise<{
  success: boolean;
  error?: string;
}> {
  return saveWelcomeKitState({
    privacy_consent_granted: true,
    has_seen_welcome_kit: true,
  });
}

/**
 * Dismiss Welcome Kit without forcing the initial assessment.
 * Marks the overlay as seen so it doesn't block dashboard usage.
 */
export async function dismissWelcomeKit(): Promise<{
  success: boolean;
  error?: string;
}> {
  return saveWelcomeKitState({
    has_seen_welcome_kit: true,
  });
}

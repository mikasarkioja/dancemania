"use server";

/**
 * Welcome Kit: first-run overlay for test users.
 * Guardian: all operations scoped to auth.uid(). Admin/Teacher skip the kit.
 */

import { createClient } from "@/lib/supabase/server";

export interface WelcomeKitStatus {
  shouldShow: boolean;
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      privacy_consent_granted: true,
      has_seen_welcome_kit: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return { success: !error, error: error?.message };
}

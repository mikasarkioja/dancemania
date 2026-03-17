"use server";

/**
 * Privacy consent gate. Guardian: all operations scoped to auth.uid().
 */

import { createClient } from "@/lib/supabase/server";

export async function getPrivacyConsentGranted(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("privacy_consent_granted")
    .eq("id", user.id)
    .single();

  return profile?.privacy_consent_granted === true;
}

/**
 * Set privacy_consent_granted to true for the current user.
 * Guardian: only the profile row for auth.uid() is updated.
 */
export async function grantPrivacyConsent(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        privacy_consent_granted: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  return { success: !error, error: error?.message };
}

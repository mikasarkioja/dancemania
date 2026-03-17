"use server";

/**
 * Post-assessment: set has_completed_assessment when user chooses "Continue with 3 free practices".
 * Guardian: only the profile for auth.uid() is updated.
 */

import { createClient } from "@/lib/supabase/server";

export async function setAssessmentCompleted(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      has_completed_assessment: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return { success: !error, error: error?.message };
}

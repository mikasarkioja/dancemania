"use server";

import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Update the current user's profile (full_name, avatar_url, bio).
 * Guardian: RLS ensures only own profile or admin can update.
 */
export async function updateProfile(params: {
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: params.full_name ?? null,
      avatar_url: params.avatar_url ?? null,
      bio: params.bio ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

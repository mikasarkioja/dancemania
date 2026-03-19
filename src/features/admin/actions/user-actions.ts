"use server";

import { createClient } from "@/lib/supabase/server";
import { isServerAdmin } from "@/lib/supabase/roles";

export type UserRole = "student" | "teacher" | "admin";

export type UpdateUserRoleResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Update a user's role. Guardian: only admin can call this.
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UpdateUserRoleResult> {
  const ok = await isServerAdmin();
  if (!ok) return { success: false, error: "Forbidden." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

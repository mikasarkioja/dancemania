import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "teacher" | "admin";

/**
 * Fetches the current user's role from the profiles table.
 * Cached for the duration of the request (React cache()).
 * Use in Server Components or server actions to enforce RBAC.
 */
export const getServerRole = cache(async (): Promise<UserRole | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | null;
  if (role === "student" || role === "teacher" || role === "admin") {
    return role;
  }
  return "student";
});

/**
 * Returns true if the current user has the admin role.
 * Checks profiles.role first; falls back to app_metadata.role for existing Supabase-set admins.
 */
export async function isServerAdmin(): Promise<boolean> {
  const role = await getServerRole();
  if (role === "admin") return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return ((user?.app_metadata?.role as string) ?? "") === "admin";
}

/** True if profiles.role or JWT indicates teacher or admin. */
export async function isServerTeacherOrAdmin(): Promise<boolean> {
  const role = await getServerRole();
  if (role === "teacher" || role === "admin") return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const jwtRole = (user?.app_metadata?.role as string) ?? "";
  return jwtRole === "admin" || jwtRole === "teacher";
}

"use server";

import { createClient } from "@/lib/supabase/server";

const FREE_PRACTICE_LIMIT = 3;

export interface CheckPracticeEntitlementResult {
  canPractice: boolean;
  currentCount: number;
  /** For UI: "X of 3 Free Practices Remaining" (0 when unlimited). */
  remaining: number;
  /** True if user is admin or teacher (bypass). */
  isBypass: boolean;
}

/**
 * Usage tracker: enforce 3-free-practices gate.
 * Guardian: admin and teacher roles bypass entirely (unlimited content creation).
 * Otherwise: canPractice if practice_sessions count < 3 or profile.is_premium.
 */
export async function checkPracticeEntitlement(): Promise<CheckPracticeEntitlementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      canPractice: false,
      currentCount: 0,
      remaining: 0,
      isBypass: false,
    };
  }

  const role = (user.app_metadata?.role as string) ?? "";
  const isBypass = role === "admin" || role === "teacher";
  if (isBypass) {
    const { count } = await supabase
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    return {
      canPractice: true,
      currentCount: count ?? 0,
      remaining: 0, // 0 = unlimited for UI
      isBypass: true,
    };
  }

  const [{ count }, { data: profile }] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.from("profiles").select("is_premium").eq("id", user.id).single(),
  ]);

  const currentCount = count ?? 0;
  const isPremium = profile?.is_premium === true;
  const canPractice = isPremium || currentCount < FREE_PRACTICE_LIMIT;
  const remaining = isPremium
    ? 0
    : Math.max(0, FREE_PRACTICE_LIMIT - currentCount);

  return {
    canPractice,
    currentCount,
    remaining,
    isBypass: false,
  };
}

export interface LogAnalyticsEventResult {
  success: boolean;
  error?: string;
}

/**
 * Log an analytics event (e.g. "Upsell Click") for intent tracking.
 * Guardian: Only the authenticated user can insert; user_id must match auth.uid().
 */
export async function logAnalyticsEvent(
  eventName: string,
  payload?: Record<string, unknown>
): Promise<LogAnalyticsEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
  const { error } = await supabase.from("analytics_events").insert({
    user_id: user.id,
    event_name: eventName,
    payload: payload ?? {},
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

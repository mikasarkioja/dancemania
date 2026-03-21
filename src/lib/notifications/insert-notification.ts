/**
 * Server-only notification inserts (service role). Used by triggers implicitly;
 * app code calls these from trusted server paths.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/lib/notifications/types";

export type NotificationPayload = {
  title: string;
  message: string;
  link?: string | null;
};

export async function insertNotification(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from("notifications").insert({
      user_id: userId,
      type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
      is_read: false,
    });
    if (error) {
      console.error("[insertNotification]", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[insertNotification]", msg);
    return { ok: false, error: msg };
  }
}

/** Notify every profile with role admin (master control tower). */
export async function insertNotificationForAllAdmins(
  type: NotificationType,
  payload: NotificationPayload
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) {
    console.error("[insertNotificationForAllAdmins]", error.message);
    return;
  }
  for (const row of admins ?? []) {
    const r = await insertNotification(row.id, type, payload);
    if (!r.ok) {
      console.error("[insertNotificationForAllAdmins] row failed", r.error);
    }
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { insertNotification } from "@/lib/notifications/insert-notification";
import type { NotificationType } from "@/lib/notifications/types";
import type { NotificationPayload } from "@/lib/notifications/insert-notification";

/**
 * Centralized pulse: enqueue a notification for a user (service role).
 * Call from other server actions / API routes when domain events occur.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await insertNotification(userId, type, payload);
  return result;
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export type NotificationType =
  | "content_approval"
  | "move_verified"
  | "xp_milestone"
  | "system_alert";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

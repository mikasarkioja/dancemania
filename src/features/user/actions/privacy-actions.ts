"use server";

/**
 * Privacy & GDPR: Right to be Forgotten and Data Portability.
 * Guardian: All operations are scoped to auth.uid(). Session is verified with
 * supabase.auth.getUser() before any delete or export. Shared registry moves
 * (Gold Standards in move_registry) are never deleted—only the user's
 * practice_sessions and their own uploaded dance_library rows.
 */

import { createClient } from "@/lib/supabase/server";

export interface DeleteUserBiometricDataResult {
  success: boolean;
  error?: string;
  deletedSessions?: number;
  deletedVideos?: number;
}

/**
 * Cascading hard delete of all biometric and practice data for the current user.
 * - practice_sessions: all rows where user_id = auth.uid()
 * - dance_library: all rows where uploaded_by = auth.uid() (student-uploaded videos only)
 *
 * Safety: Shared Gold Standard moves (move_registry) and videos uploaded by others
 * are never deleted. Only the authenticated user's private practice attempts and
 * personal uploads are removed.
 *
 * Guardian: Verifies session with getUser(); uses createClient() (user JWT) so RLS
 * (practice_sessions_delete_own, dance_library_delete_own_uploads) enforces scope.
 */
export async function deleteUserBiometricData(): Promise<DeleteUserBiometricDataResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const uid = user.id;

  // 1) Delete all practice_sessions for this user (RLS: practice_sessions_delete_own)
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("practice_sessions")
    .delete()
    .eq("user_id", uid)
    .select("id");

  if (sessionsError) {
    return { success: false, error: sessionsError.message };
  }

  const deletedSessions = sessionsData?.length ?? 0;

  // 2) Delete dance_library rows uploaded by this user (RLS: dance_library_delete_own_uploads)
  const { data: videosData, error: videosError } = await supabase
    .from("dance_library")
    .delete()
    .eq("uploaded_by", uid)
    .select("id");

  if (videosError) {
    return {
      success: false,
      error: videosError.message,
      deletedSessions,
    };
  }

  const deletedVideos = videosData?.length ?? 0;

  return {
    success: true,
    deletedSessions,
    deletedVideos,
  };
}

export interface ExportUserDataResult {
  success: boolean;
  error?: string;
  /** JSON-serializable payload for download (practice_sessions metadata only). */
  data?: {
    exportedAt: string;
    practiceSessions: Array<{
      id: string;
      video_id: string;
      created_at: string;
      score_total: number | null;
      session_name: string | null;
    }>;
  };
}

/**
 * Data portability: export current user's practice_sessions metadata (scores, dates).
 * No motion/biometric payload—metadata only for a simple GDPR export.
 * Guardian: createClient() + RLS ensures only the user's own sessions are returned.
 */
export async function exportUserData(): Promise<ExportUserDataResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: rows, error } = await supabase
    .from("practice_sessions")
    .select("id, video_id, created_at, score_total, session_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      practiceSessions: (rows ?? []).map((r) => ({
        id: r.id,
        video_id: r.video_id,
        created_at: r.created_at,
        score_total: r.score_total ?? null,
        session_name: r.session_name ?? null,
      })),
    },
  };
}

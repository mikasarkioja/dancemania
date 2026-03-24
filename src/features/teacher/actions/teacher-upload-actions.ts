"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getServerRole } from "@/lib/supabase/roles";
import { hasOperatorPasswordAccess } from "@/lib/auth/operator-access";
import { runProcessDanceVideoForRow } from "@/lib/extraction/run-process-dance-video";
import { insertNotificationForAllAdmins } from "@/lib/notifications/insert-notification";

function mapDifficulty(
  stars: number
): "beginner" | "intermediate" | "advanced" {
  if (stars <= 2) return "beginner";
  if (stars === 3) return "intermediate";
  return "advanced";
}

function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return s.slice(0, 48) || "move";
}

export type ProcessTeacherUploadResult =
  | { ok: true; videoId: string }
  | { ok: false; error: string };

function isTeacherOrAdminRole(
  profileRole: string | null,
  jwtRole: string
): boolean {
  return (
    profileRole === "teacher" ||
    profileRole === "admin" ||
    jwtRole === "teacher" ||
    jwtRole === "admin"
  );
}

/**
 * Teacher Studio: upload raw video to private bucket, insert dance_library (processing),
 * then run extraction in the background (same pipeline as admin).
 */
export async function processTeacherUpload(
  formData: FormData
): Promise<ProcessTeacherUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const operatorAccess = await hasOperatorPasswordAccess();
  if (!user && !operatorAccess) {
    return { ok: false, error: "Sign in required." };
  }

  const profileRole = user ? await getServerRole() : null;
  const jwtRole = (user?.app_metadata?.role as string) ?? "";
  if (!operatorAccess && !isTeacherOrAdminRole(profileRole, jwtRole)) {
    return { ok: false, error: "Only teachers or admins can upload here." };
  }

  const db = user ? supabase : createServiceRoleClient();

  const file = formData.get("video") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const desc = String(formData.get("description") ?? "").trim();
  const starsRaw = Number(formData.get("difficultyStars") ?? 3);
  const stars = Math.min(
    5,
    Math.max(1, Number.isFinite(starsRaw) ? Math.round(starsRaw) : 3)
  );

  if (!file || file.size === 0) {
    return { ok: false, error: "Choose a video file." };
  }
  if (!title) {
    return { ok: false, error: "Move name is required." };
  }
  if (genre !== "salsa" && genre !== "bachata") {
    return { ok: false, error: "Genre must be Salsa or Bachata." };
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext !== "mp4" && ext !== "mov") {
    return { ok: false, error: "Only .mp4 and .mov are supported." };
  }

  const objectPath = `${user?.id ?? "operator"}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await db.storage
    .from("teacher-uploads")
    .upload(objectPath, buffer, {
      contentType:
        file.type || (ext === "mov" ? "video/quicktime" : "video/mp4"),
      upsert: false,
    });

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const baseSlug = slugify(title);
  const actorTag = (user?.id ?? "operator").slice(0, 8);
  const finalSlug =
    `t-${actorTag}-${baseSlug}-${Date.now().toString(36)}`.slice(0, 120);

  const { data: insertRow, error: insertError } = await db
    .from("dance_library")
    .insert({
      slug: finalSlug,
      title,
      genre,
      difficulty: mapDifficulty(stars),
      video_url: null,
      source_bucket: "teacher-uploads",
      storage_object_path: objectPath,
      bpm: null,
      motion_dna: null,
      tracking_seeds: null,
      status: "processing",
      description: desc || null,
      ...(user?.id ? { uploaded_by: user.id, creator_id: user.id } : {}),
    })
    .select("id")
    .single();

  if (insertError || !insertRow) {
    await db.storage.from("teacher-uploads").remove([objectPath]);
    return {
      ok: false,
      error: insertError?.message ?? "Could not create library row.",
    };
  }

  void runProcessDanceVideoForRow(insertRow.id).then((r) => {
    if (!r.ok) {
      console.error("[processTeacherUpload] extraction failed:", r.error);
    }
  });

  revalidatePath("/teacher/upload");
  revalidatePath("/teacher");
  return { ok: true, videoId: insertRow.id };
}

export type SubmitTeacherApprovalResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * After AI labels are confirmed and segments saved — hand off to master admin.
 */
export async function submitTeacherVideoForApproval(
  videoId: string
): Promise<SubmitTeacherApprovalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const operatorAccess = await hasOperatorPasswordAccess();
  if (!user && !operatorAccess) {
    return { ok: false, error: "Sign in required." };
  }

  const db = user ? supabase : createServiceRoleClient();
  const role = user ? await getServerRole() : null;
  const jwtRole = (user?.app_metadata?.role as string) ?? "";
  const isAdmin = operatorAccess || role === "admin" || jwtRole === "admin";

  const { data: row, error } = await db
    .from("dance_library")
    .select("id, creator_id, status, instructions, title")
    .eq("id", videoId)
    .single();

  if (error || !row) {
    return { ok: false, error: "Video not found." };
  }

  if (user && row.creator_id !== user.id && !isAdmin) {
    return { ok: false, error: "You can only submit your own uploads." };
  }

  if (row.status !== "needs_labeling" && row.status !== "needs_relabeling") {
    return {
      ok: false,
      error: "Submit only when the video is ready for labeling review.",
    };
  }

  const instructions = Array.isArray(row.instructions) ? row.instructions : [];
  if (instructions.length === 0) {
    return {
      ok: false,
      error:
        "Add at least one move segment (Save instructions) before submitting.",
    };
  }

  const { error: uErr } = await db
    .from("dance_library")
    .update({
      status: "pending_admin_approval",
      updated_at: new Date().toISOString(),
    })
    .eq("id", videoId);

  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  const moveTitle = (row.title as string | null)?.trim() ?? "A move";
  void insertNotificationForAllAdmins("content_approval", {
    title: "Gold-standard queue",
    message: `A teacher submitted "${moveTitle}" for master admin approval.`,
    link: `/admin/label/${videoId}`,
  });

  revalidatePath(`/admin/label/${videoId}`);
  revalidatePath("/admin/label");
  revalidatePath("/admin");
  revalidatePath("/teacher/upload");
  return { ok: true };
}

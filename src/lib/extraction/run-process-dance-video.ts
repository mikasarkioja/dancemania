/**
 * Shared extraction pipeline: resolve video URL (public or signed private storage),
 * call Python bridge, persist motion_dna + needs_labeling.
 * Caller must enforce auth (API route or server action).
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { insertNotification } from "@/lib/notifications/insert-notification";
import type { PoseData } from "@/types/dance";

const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL;
const EXTRACTION_API_KEY = process.env.EXTRACTION_API_KEY;
const EXTRACTION_TIMEOUT_MS = 90_000;
const EXTRACTION_RETRIES = 2;
const EXTRACTION_RETRY_DELAY_MS = 3_000;

const LOG_PREFIX = "[process-dance-video]";
const SIGNED_URL_TTL_SEC = 60 * 60 * 12; // 12h for long labeling sessions

export type ProcessDanceVideoRow = {
  id: string;
  video_url: string | null;
  source_bucket: string | null;
  storage_object_path: string | null;
};

export type RunProcessDanceVideoResult =
  | { ok: true; rowId: string; status: "needs_labeling"; frameCount: number }
  | { ok: false; error: string; httpStatus: number };

async function fetchWithTimeoutAndRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  retries: number,
  retryDelayMs: number
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      clearTimeout(timeout);
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        console.warn(
          `${LOG_PREFIX} Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${retryDelayMs}ms...`,
          lastError.message
        );
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }
  throw lastError ?? new Error("Fetch failed");
}

function isValidPoseData(value: unknown): value is PoseData {
  if (value == null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.frames)) return false;
  if (typeof o.durationMs !== "number") return false;
  for (const frame of o.frames as unknown[]) {
    if (frame == null || typeof frame !== "object") return false;
    const f = frame as Record<string, unknown>;
    if (typeof f.timestamp !== "number") return false;
    const partnerId = f.partner_id;
    if (partnerId !== 0 && partnerId !== 1) return false;
    if (typeof f.joints !== "object" || f.joints == null) return false;
  }
  return true;
}

async function resolveVideoUrlForExtraction(
  row: ProcessDanceVideoRow
): Promise<{ ok: true; videoUrl: string } | { ok: false; error: string }> {
  const trimmed = row.video_url?.trim() ?? "";
  if (trimmed.length > 0) {
    return { ok: true, videoUrl: trimmed };
  }
  const bucket = row.source_bucket?.trim();
  const path = row.storage_object_path?.trim();
  if (!bucket || !path) {
    return { ok: false, error: "No video_url or storage path for extraction" };
  }
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) {
      return {
        ok: false,
        error: error?.message ?? "Could not create signed URL for extraction",
      };
    }
    return { ok: true, videoUrl: data.signedUrl };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Runs pose extraction for a dance_library row (by id). Uses service role for DB read/update and signing.
 */
export async function runProcessDanceVideoForRow(
  targetId: string
): Promise<RunProcessDanceVideoResult> {
  if (!EXTRACTION_SERVICE_URL) {
    console.warn(`${LOG_PREFIX} EXTRACTION_SERVICE_URL not configured`);
    return {
      ok: false,
      error: "EXTRACTION_SERVICE_URL not configured",
      httpStatus: 503,
    };
  }

  const admin = createServiceRoleClient();
  const { data: row, error: fetchError } = await admin
    .from("dance_library")
    .select(
      "id, video_url, source_bucket, storage_object_path, creator_id, title"
    )
    .eq("id", targetId)
    .single();

  if (fetchError || !row) {
    return { ok: false, error: "Row not found", httpStatus: 404 };
  }

  const resolved = await resolveVideoUrlForExtraction(
    row as ProcessDanceVideoRow
  );
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, httpStatus: 400 };
  }
  const videoUrl = resolved.videoUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (EXTRACTION_API_KEY) {
    headers["Authorization"] = `Bearer ${EXTRACTION_API_KEY}`;
    headers["X-API-Key"] = EXTRACTION_API_KEY;
  }

  console.info(
    `${LOG_PREFIX} [Supply Chain] Sent to AI — rowId=${targetId} video_url=${videoUrl.slice(0, 60)}...`
  );

  let res: Response;
  try {
    res = await fetchWithTimeoutAndRetry(
      EXTRACTION_SERVICE_URL,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ video_url: videoUrl }),
      },
      EXTRACTION_TIMEOUT_MS,
      EXTRACTION_RETRIES,
      EXTRACTION_RETRY_DELAY_MS
    );
  } catch (e) {
    console.error(
      `${LOG_PREFIX} [Supply Chain] AI request failed after timeout/retries:`,
      e instanceof Error ? e.message : e
    );
    return {
      ok: false,
      error:
        e instanceof Error && e.name === "AbortError"
          ? "Extraction service timeout (cold start or slow response)"
          : String(e instanceof Error ? e.message : e),
      httpStatus: 502,
    };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `${LOG_PREFIX} [Supply Chain] AI returned error: ${res.status} ${text.slice(0, 200)}`
    );
    return {
      ok: false,
      error: `Extraction service error: ${res.status} ${text.slice(0, 200)}`,
      httpStatus: 502,
    };
  }

  const data = (await res.json()) as unknown;
  if (!isValidPoseData(data)) {
    console.error(
      `${LOG_PREFIX} [Supply Chain] AI returned invalid PoseData shape for rowId=${targetId}`
    );
    return {
      ok: false,
      error: "Extraction service returned invalid PoseData shape",
      httpStatus: 502,
    };
  }

  const motionDna = data as PoseData;
  const frameCount = motionDna.frames?.length ?? 0;

  const { error: updateError } = await admin
    .from("dance_library")
    .update({
      motion_dna: motionDna,
      status: "needs_labeling",
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (updateError) {
    console.error(
      `${LOG_PREFIX} [Supply Chain] Data Saved failed:`,
      updateError.message
    );
    return { ok: false, error: updateError.message, httpStatus: 500 };
  }

  console.info(
    `${LOG_PREFIX} [Supply Chain] Data Saved — rowId=${targetId} status=needs_labeling frames=${frameCount}`
  );

  const creatorId = row.creator_id as string | null | undefined;
  if (creatorId) {
    const moveTitle = (row.title as string | null)?.trim() || "your move";
    void insertNotification(creatorId, "system_alert", {
      title: "Motion DNA ready",
      message: `Extraction finished for "${moveTitle}". You can review AI labels now.`,
      link: `/admin/label/${targetId}`,
    });
  }

  return {
    ok: true,
    rowId: targetId,
    status: "needs_labeling",
    frameCount,
  };
}

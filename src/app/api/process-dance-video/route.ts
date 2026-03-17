import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { PoseData } from "@/types/dance";

/**
 * Process-dance-video: extraction edge function.
 * Guardian: Only admin or teacher role can trigger. Uses Service Role to update dance_library.
 * Supply chain: Sent to AI → AI Processing → Data Saved.
 *
 * Expected JSON response from Python bridge: PoseData (MotionDNA).
 * @see src/types/dance.ts (PoseData, PoseFrame, Joint3D)
 */
export type PythonBridgePoseDataResponse = PoseData;

const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL;
const EXTRACTION_API_KEY = process.env.EXTRACTION_API_KEY;
const EXTRACTION_TIMEOUT_MS = 90_000;
const EXTRACTION_RETRIES = 2;
const EXTRACTION_RETRY_DELAY_MS = 3_000;

const LOG_PREFIX = "[process-dance-video]";

export interface ProcessDanceVideoBody {
  /** dance_library row id to update (preferred). */
  rowId?: string;
  /** If rowId omitted, we look up by video_url (must be unique). */
  videoUrl?: string;
}

async function isAdminOrTeacher(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const role = (user.app_metadata?.role as string) ?? "";
  return role === "admin" || role === "teacher";
}

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProcessDanceVideoBody;
    const { rowId, videoUrl: bodyVideoUrl } = body;

    const allowed = await isAdminOrTeacher();
    if (!allowed) {
      console.warn(
        `${LOG_PREFIX} Unauthorized: caller is not admin or teacher`
      );
      return NextResponse.json(
        { ok: false, error: "Only admin or teacher can trigger extraction" },
        { status: 403 }
      );
    }

    if (!EXTRACTION_SERVICE_URL) {
      console.warn(`${LOG_PREFIX} EXTRACTION_SERVICE_URL not configured`);
      return NextResponse.json(
        {
          ok: false,
          error: "EXTRACTION_SERVICE_URL not configured",
          expectedResponseShape:
            "PoseData: { frames: PoseFrame[], durationMs: number, source?, metadata? }",
        },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    let targetId: string;
    let videoUrl: string;

    if (rowId) {
      const { data: row, error: fetchError } = await supabase
        .from("dance_library")
        .select("id, video_url")
        .eq("id", rowId)
        .single();
      if (fetchError || !row) {
        return NextResponse.json(
          { ok: false, error: "Row not found or access denied" },
          { status: 404 }
        );
      }
      targetId = row.id;
      videoUrl = row.video_url ?? "";
    } else if (bodyVideoUrl) {
      const { data: row, error: fetchError } = await supabase
        .from("dance_library")
        .select("id, video_url")
        .eq("video_url", bodyVideoUrl)
        .maybeSingle();
      if (fetchError || !row) {
        return NextResponse.json(
          { ok: false, error: "No dance_library row with this video_url" },
          { status: 404 }
        );
      }
      targetId = row.id;
      videoUrl = row.video_url ?? "";
    } else {
      return NextResponse.json(
        { ok: false, error: "Provide rowId or videoUrl" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        {
          ok: false,
          error:
            e instanceof Error && e.name === "AbortError"
              ? "Extraction service timeout (cold start or slow response)"
              : String(e instanceof Error ? e.message : e),
        },
        { status: 502 }
      );
    }

    console.info(
      `${LOG_PREFIX} [Supply Chain] AI Processing — status=${res.status} rowId=${targetId}`
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `${LOG_PREFIX} [Supply Chain] AI returned error: ${res.status} ${text.slice(0, 200)}`
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Extraction service error: ${res.status} ${text.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as unknown;
    if (!isValidPoseData(data)) {
      console.error(
        `${LOG_PREFIX} [Supply Chain] AI returned invalid PoseData shape for rowId=${targetId}`
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Extraction service returned invalid PoseData shape",
        },
        { status: 502 }
      );
    }

    const motionDna = data as PythonBridgePoseDataResponse;
    const frameCount = motionDna.frames?.length ?? 0;

    const admin = createServiceRoleClient();
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
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    console.info(
      `${LOG_PREFIX} [Supply Chain] Data Saved — rowId=${targetId} status=needs_labeling frames=${frameCount}`
    );

    return NextResponse.json({
      ok: true,
      rowId: targetId,
      status: "needs_labeling",
      frameCount,
    });
  } catch (e) {
    console.error(`${LOG_PREFIX}`, e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
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

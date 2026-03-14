import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PoseData } from "@/types/dance";

/**
 * Expected JSON response shape from the Python extraction bridge.
 * Must match PoseData (MotionDNA) so motion_dna can be stored in dance_library.
 *
 * @see src/types/dance.ts (PoseData, PoseFrame, Joint3D, MotionMetadata)
 *
 * Shape:
 * {
 *   frames: Array<{
 *     timestamp: number;        // ms or seconds (consistent within payload)
 *     partner_id: 0 | 1;       // 0 = Lead, 1 = Follower
 *     joints: Record<string, { x: number; y: number; z: number; visibility: number }>;
 *     metrics: { rhythm_pulse: number; joint_angles: Record<string, number> };
 *   }>;
 *   durationMs: number;
 *   source?: "teacher" | "student" | "reference";
 *   metadata?: { beat_timestamps?: number[] };
 * }
 */
export type PythonBridgePoseDataResponse = PoseData;

const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL;

export interface ProcessDanceVideoBody {
  /** dance_library row id to update (preferred). */
  rowId?: string;
  /** If rowId omitted, we look up by video_url (must be unique). */
  videoUrl?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProcessDanceVideoBody;
    const { rowId, videoUrl: bodyVideoUrl } = body;

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
      videoUrl = row.video_url;
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
      videoUrl = row.video_url;
    } else {
      return NextResponse.json(
        { ok: false, error: "Provide rowId or videoUrl" },
        { status: 400 }
      );
    }

    let motionDna: PythonBridgePoseDataResponse;

    if (EXTRACTION_SERVICE_URL) {
      const res = await fetch(EXTRACTION_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          {
            ok: false,
            error: `Extraction service error: ${res.status} ${text}`,
          },
          { status: 502 }
        );
      }
      const data = (await res.json()) as unknown;
      if (!isValidPoseData(data)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Extraction service returned invalid PoseData shape",
          },
          { status: 502 }
        );
      }
      motionDna = data as PythonBridgePoseDataResponse;
    } else {
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

    const { error: updateError } = await supabase
      .from("dance_library")
      .update({
        motion_dna: motionDna,
        status: "needs_labeling",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      rowId: targetId,
      status: "needs_labeling",
      frameCount: motionDna.frames?.length ?? 0,
    });
  } catch (e) {
    console.error("[process-dance-video]", e);
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

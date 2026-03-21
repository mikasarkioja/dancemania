import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerRole } from "@/lib/supabase/roles";
import { runProcessDanceVideoForRow } from "@/lib/extraction/run-process-dance-video";

/**
 * Process-dance-video: extraction bridge.
 * Guardian: Only admin or teacher (profiles.role) can trigger. Row must be visible via RLS.
 *
 * @see src/lib/extraction/run-process-dance-video.ts
 */
export interface ProcessDanceVideoBody {
  rowId?: string;
  videoUrl?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProcessDanceVideoBody;
    const { rowId, videoUrl: bodyVideoUrl } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const jwtRole = (user?.app_metadata?.role as string) ?? "";
    const role = await getServerRole();
    const allowed =
      role === "admin" ||
      role === "teacher" ||
      jwtRole === "admin" ||
      jwtRole === "teacher";

    if (!allowed) {
      console.warn(
        "[process-dance-video] Unauthorized: caller is not admin or teacher"
      );
      return NextResponse.json(
        { ok: false, error: "Only admin or teacher can trigger extraction" },
        { status: 403 }
      );
    }
    let targetId: string;

    if (rowId) {
      const { data: row, error: fetchError } = await supabase
        .from("dance_library")
        .select("id")
        .eq("id", rowId)
        .single();
      if (fetchError || !row) {
        return NextResponse.json(
          { ok: false, error: "Row not found or access denied" },
          { status: 404 }
        );
      }
      targetId = row.id;
    } else if (bodyVideoUrl) {
      const { data: row, error: fetchError } = await supabase
        .from("dance_library")
        .select("id")
        .eq("video_url", bodyVideoUrl)
        .maybeSingle();
      if (fetchError || !row) {
        return NextResponse.json(
          { ok: false, error: "No dance_library row with this video_url" },
          { status: 404 }
        );
      }
      targetId = row.id;
    } else {
      return NextResponse.json(
        { ok: false, error: "Provide rowId or videoUrl" },
        { status: 400 }
      );
    }

    const result = await runProcessDanceVideoForRow(targetId);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.httpStatus }
      );
    }

    return NextResponse.json({
      ok: true,
      rowId: result.rowId,
      status: result.status,
      frameCount: result.frameCount,
    });
  } catch (e) {
    console.error("[process-dance-video]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

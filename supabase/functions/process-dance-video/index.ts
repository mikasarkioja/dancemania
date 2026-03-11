/**
 * process-dance-video – Supabase Edge Function
 *
 * Triggered by a Database Webhook on INSERT into public.dance_library when
 * video_url is set. Receives the new row (id, video_url, tracking_seeds, etc.)
 * and should call the Python extraction engine to generate motion_dna.
 *
 * Setup: In Supabase Dashboard → Database → Webhooks, create a webhook:
 *   - Events: Insert
 *   - Table: public.dance_library
 *   - URL: https://<project-ref>.supabase.co/functions/v1/process-dance-video
 *   - (Optional) Add a filter so it only fires when video_url is not null.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DanceLibraryRecord {
  id: string;
  slug?: string;
  title?: string;
  genre?: string;
  difficulty?: string;
  video_url: string;
  bpm?: number | null;
  motion_dna?: unknown;
  tracking_seeds?: {
    leader_hip_seed: { x: number; y: number };
    follower_hip_seed: { x: number; y: number };
  } | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: DanceLibraryRecord | null;
  old_record: DanceLibraryRecord | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;

    if (payload.type !== "INSERT" || payload.table !== "dance_library") {
      return new Response(
        JSON.stringify({ ok: true, skipped: "not an insert on dance_library" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const record = payload.record;
    if (!record?.video_url) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no video_url" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoUrl = record.video_url;
    const trackingSeeds = record.tracking_seeds ?? undefined;
    const rowId = record.id;

    // TODO: Call Python extraction engine (e.g. HTTP to a service that runs
    // BlazePose/MediaPipe on the video, uses tracking_seeds to assign
    // pose tracks to Leader vs Follower, returns motion_dna).
    // Example:
    //   const motionDna = await callPythonExtractionEngine(videoUrl, trackingSeeds);
    //   await updateDanceLibraryRow(rowId, { motion_dna: motionDna });
    console.log(
      "[process-dance-video] Would call extraction engine:",
      { rowId, videoUrl, trackingSeeds }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        rowId,
        message:
          "Webhook received; Python extraction engine integration pending.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[process-dance-video]", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

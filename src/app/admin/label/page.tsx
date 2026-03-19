import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getAppGenre } from "@/lib/genre-server";
import { AdminVideoQueueRow } from "@/features/admin/components/AdminVideoQueueRow";
import { computeVideoPipelineSteps } from "@/lib/admin/video-pipeline-state";
import type { DanceInstructions, MotionDNA } from "@/types/dance";

function hasMotionDnaPayload(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return false;
  const frames = (raw as MotionDNA).frames;
  return Array.isArray(frames) && frames.length > 0;
}

export default async function AdminLabelPage() {
  const supabase = await createClient();
  const appGenre = await getAppGenre();
  const { data: rows } = await supabase
    .from("dance_library")
    .select(
      "id, slug, title, display_name, video_url, status, motion_dna, instructions"
    )
    .eq("genre", appGenre)
    .order("created_at", { ascending: false });

  return (
    <main className="container max-w-3xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">Label videos</h1>
      <p className="mb-2 text-muted-foreground">
        Track each video through the pipeline:{" "}
        <strong className="text-foreground">Upload</strong> →{" "}
        <strong className="text-foreground">Extraction</strong> →{" "}
        <strong className="text-foreground">Label</strong> →{" "}
        <strong className="text-foreground">Review / Publish</strong>.
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Students</span> only see{" "}
        <code className="rounded bg-muted px-1 text-xs">published</code> videos.{" "}
        Operator playbook:{" "}
        <code className="rounded bg-muted px-1">
          docs/ACADEMY_ADMIN_VIDEO_WORKFLOW.md
        </code>
      </p>
      {rows && rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((row) => {
            const instructions = Array.isArray(row.instructions)
              ? (row.instructions as DanceInstructions)
              : [];
            const hasDna = hasMotionDnaPayload(row.motion_dna);
            const steps = computeVideoPipelineSteps({
              status: row.status,
              hasMotionDna: hasDna,
              instructionSegmentCount: instructions.length,
            });
            return (
              <AdminVideoQueueRow
                key={row.id}
                videoId={row.id}
                title={row.display_name?.trim() || row.title}
                slug={row.slug}
                status={row.status}
                hasMotionDna={hasDna}
                steps={steps}
              />
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          No videos in the library yet. Upload one from the Admin page first.
        </p>
      )}
      <p className="mt-6">
        <Link href="/admin" className="text-sm text-primary underline">
          ← Back to Admin
        </Link>
      </p>
    </main>
  );
}

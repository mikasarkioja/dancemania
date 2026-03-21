import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoReviewerWrapper } from "./video-reviewer-wrapper";
import { AdminVideoPipelineSteps } from "@/features/admin/components/AdminVideoPipelineSteps";
import { RetryExtractionButton } from "@/features/admin/components/RetryExtractionButton";
import {
  computeVideoPipelineSteps,
  pipelineProgressSummary,
} from "@/lib/admin/video-pipeline-state";
import type { DanceInstructions, MotionDNA } from "@/types/dance";
import { resolveDanceLibraryPlaybackUrl } from "@/lib/dance-library/resolve-playback-url";

function hasMotionDnaPayload(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return false;
  const frames = (raw as MotionDNA).frames;
  return Array.isArray(frames) && frames.length > 0;
}

export default async function AdminReviewVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("dance_library")
    .select(
      "id, slug, title, video_url, source_bucket, storage_object_path, instructions, motion_dna, status, verified_at, rejection_reason"
    )
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  const playbackUrl = await resolveDanceLibraryPlaybackUrl(supabase, {
    video_url: row.video_url,
    source_bucket: row.source_bucket as string | null,
    storage_object_path: row.storage_object_path as string | null,
  });

  if (!playbackUrl) {
    return (
      <main className="container max-w-6xl py-8">
        <p className="mb-4 text-destructive">
          Could not resolve a playable URL for this video.
        </p>
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to label list
        </Link>
      </main>
    );
  }

  const instructions = Array.isArray(row.instructions)
    ? (row.instructions as DanceInstructions)
    : [];
  const hasDna = hasMotionDnaPayload(row.motion_dna);
  const pipelineSteps = computeVideoPipelineSteps({
    status: row.status,
    hasMotionDna: hasDna,
    instructionSegmentCount: instructions.length,
  });
  const summary = pipelineProgressSummary(pipelineSteps, row.status);
  const showRetry = row.status === "pending_analysis" && !hasDna;

  return (
    <main className="container max-w-6xl py-8">
      <p className="mb-4">
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to label list
        </Link>
      </p>
      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <AdminVideoPipelineSteps steps={pipelineSteps} variant="full" />
        <p className="text-sm text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap gap-3">
          {showRetry && <RetryExtractionButton videoId={row.id} />}
          <Link
            href={`/admin/label/${row.id}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            ← Back to Label editor
          </Link>
        </div>
      </section>
      <VideoReviewerWrapper
        videoId={row.id}
        videoUrl={playbackUrl}
        title={row.title}
        motionDna={row.motion_dna ?? null}
        instructions={instructions}
        status={row.status ?? null}
      />
    </main>
  );
}

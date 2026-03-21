import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoLabelerWrapper } from "./video-labeler-wrapper";
import { mergePatternsWithRegistry } from "@/lib/patterns";
import { getAppGenre } from "@/lib/genre-server";
import { computeVideoPipelineSteps } from "@/lib/admin/video-pipeline-state";
import type { DanceInstructions, MotionDNA } from "@/types/dance";
import { getServerRole } from "@/lib/supabase/roles";
import { resolveDanceLibraryPlaybackUrl } from "@/lib/dance-library/resolve-playback-url";

function hasMotionDnaPayload(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return false;
  const frames = (raw as MotionDNA).frames;
  return Array.isArray(frames) && frames.length > 0;
}

export default async function AdminLabelVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const appGenre = await getAppGenre();
  const [
    { data: row, error },
    { data: moveNames },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("dance_library")
      .select(
        "id, slug, title, video_url, source_bucket, storage_object_path, instructions, motion_dna, suggested_labels, bpm, genre, status, creator_id"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("move_registry")
      .select("name")
      .eq("status", "approved")
      .or(`genre.eq.${appGenre},genre.is.null`),
    supabase.auth.getUser(),
  ]);

  if (error || !row) notFound();
  const isAuthenticated = !!user;

  const playbackUrl = await resolveDanceLibraryPlaybackUrl(supabase, {
    video_url: row.video_url,
    source_bucket: row.source_bucket as string | null,
    storage_object_path: row.storage_object_path as string | null,
  });

  if (!playbackUrl) {
    return (
      <main className="container max-w-6xl py-8">
        <p className="mb-4 text-destructive">
          Could not resolve a playable URL for this video. Check storage path
          and bucket policies.
        </p>
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to list
        </Link>
      </main>
    );
  }

  const instructions = Array.isArray(row.instructions)
    ? (row.instructions as DanceInstructions)
    : [];
  const suggestedLabels = Array.isArray(row.suggested_labels)
    ? row.suggested_labels
    : [];
  const patterns = mergePatternsWithRegistry(
    (moveNames ?? []).map((r) => (r.name ?? "").trim()).filter(Boolean)
  );
  const hasDna = hasMotionDnaPayload(row.motion_dna);
  const pipelineSteps = computeVideoPipelineSteps({
    status: row.status,
    hasMotionDna: hasDna,
    instructionSegmentCount: instructions.length,
  });

  const role = await getServerRole();
  const showSubmitGold =
    user?.id === row.creator_id &&
    role === "teacher" &&
    (row.status === "needs_labeling" || row.status === "needs_relabeling") &&
    instructions.length > 0;

  return (
    <main className="container max-w-6xl py-8">
      <p className="mb-4">
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to list
        </Link>
      </p>
      <VideoLabelerWrapper
        videoId={row.id}
        videoUrl={playbackUrl}
        title={row.title}
        initialInstructions={instructions}
        motionDna={row.motion_dna ?? null}
        suggestedLabels={suggestedLabels}
        patterns={patterns}
        isAuthenticated={isAuthenticated}
        bpm={row.bpm ?? null}
        genre={row.genre ?? null}
        libraryStatus={row.status}
        pipelineSteps={pipelineSteps}
        submitForGoldStandard={showSubmitGold}
      />
    </main>
  );
}

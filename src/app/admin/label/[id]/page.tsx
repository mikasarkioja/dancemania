import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoLabelerWrapper } from "./video-labeler-wrapper";
import { mergePatternsWithRegistry } from "@/lib/patterns";
import { getAppGenre } from "@/lib/genre-server";
import { computeVideoPipelineSteps } from "@/lib/admin/video-pipeline-state";
import type { DanceInstructions, MotionDNA } from "@/types/dance";

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
        "id, slug, title, video_url, instructions, motion_dna, suggested_labels, bpm, genre, status"
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

  return (
    <main className="container max-w-6xl py-8">
      <p className="mb-4">
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to list
        </Link>
      </p>
      <VideoLabelerWrapper
        videoId={row.id}
        videoUrl={row.video_url}
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
      />
    </main>
  );
}

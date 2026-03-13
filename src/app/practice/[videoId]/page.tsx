import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PracticeCapture, PracticePlayer } from "@/features/practice";
import type { MotionDNA, DanceInstructions, MoveSegment } from "@/types/dance";

export default async function PracticeVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("dance_library")
    .select("id, title, video_url, instructions, motion_dna, genre")
    .eq("id", videoId)
    .eq("status", "published")
    .single();

  if (error || !row) notFound();

  const rawInstructions = Array.isArray(row.instructions) ? row.instructions as MoveSegment[] : [];
  const instructions: DanceInstructions = rawInstructions.map((seg) => ({
    startTime: seg.startTime,
    endTime: seg.endTime,
    pattern: seg.pattern,
    teacherInstruction: seg.teacherInstruction ?? "",
  }));
  const motionDna = (row.motion_dna as MotionDNA | null) ?? null;
  const hasMotionData =
    motionDna?.frames && Array.isArray(motionDna.frames) && motionDna.frames.length > 0;
  const genre =
    row.genre === "bachata" ? "Bachata" : "Salsa";

  return (
    <main className="container py-6">
      <p className="mb-4">
        <Link href="/library" className="text-sm text-primary underline">
          ← Back to library
        </Link>
      </p>
      {hasMotionData ? (
        <PracticeCapture
          videoId={row.id}
          title={row.title}
          videoUrl={row.video_url}
          motionDna={motionDna}
          genre={genre}
          instructions={instructions}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            This video doesn’t have pose data yet. Watch and follow along; webcam comparison will be available once the video is processed.
          </p>
          <PracticePlayer
            videoId={row.id}
            title={row.title}
            videoUrl={row.video_url}
            instructions={instructions}
          />
        </>
      )}
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoReviewerWrapper } from "./video-reviewer-wrapper";

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
      "id, slug, title, video_url, instructions, motion_dna, status, verified_at, rejection_reason"
    )
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  const instructions = Array.isArray(row.instructions) ? row.instructions : [];

  return (
    <main className="container py-8">
      <p className="mb-4">
        <Link href="/admin/label" className="text-sm text-primary underline">
          ← Back to label list
        </Link>
      </p>
      <VideoReviewerWrapper
        videoId={row.id}
        videoUrl={row.video_url}
        title={row.title}
        motionDna={row.motion_dna ?? null}
        instructions={instructions}
        status={row.status ?? null}
      />
    </main>
  );
}

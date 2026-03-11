import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoLabelerWrapper } from "./video-labeler-wrapper";

export default async function AdminLabelVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("dance_library")
    .select("id, slug, title, video_url, instructions, motion_dna")
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  const instructions = Array.isArray(row.instructions) ? row.instructions : [];

  return (
    <main className="container py-8">
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
      />
    </main>
  );
}

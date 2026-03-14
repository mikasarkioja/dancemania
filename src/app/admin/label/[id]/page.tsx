import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoLabelerWrapper } from "./video-labeler-wrapper";
import { mergePatternsWithRegistry } from "@/lib/patterns";

export default async function AdminLabelVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
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
        "id, slug, title, video_url, instructions, motion_dna, suggested_labels"
      )
      .eq("id", id)
      .single(),
    supabase.from("move_registry").select("name").eq("status", "approved"),
    supabase.auth.getUser(),
  ]);

  if (error || !row) notFound();
  const isAuthenticated = !!user;

  const instructions = Array.isArray(row.instructions) ? row.instructions : [];
  const suggestedLabels = Array.isArray(row.suggested_labels)
    ? row.suggested_labels
    : [];
  const patterns = mergePatternsWithRegistry(
    (moveNames ?? []).map((r) => (r.name ?? "").trim()).filter(Boolean)
  );

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
        suggestedLabels={suggestedLabels}
        patterns={patterns}
        isAuthenticated={isAuthenticated}
      />
    </main>
  );
}

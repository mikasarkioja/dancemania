import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PracticePlayer } from "@/features/practice";

export default async function PracticeVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("dance_library")
    .select("id, title, video_url, instructions")
    .eq("id", videoId)
    .eq("status", "published")
    .single();

  if (error || !row) notFound();

  const instructions = Array.isArray(row.instructions) ? row.instructions : [];

  return (
    <main className="container py-6">
      <p className="mb-4">
        <Link href="/library" className="text-sm text-primary underline">
          ← Back to library
        </Link>
      </p>
      <PracticePlayer
        videoId={row.id}
        title={row.title}
        videoUrl={row.video_url}
        instructions={instructions}
      />
    </main>
  );
}

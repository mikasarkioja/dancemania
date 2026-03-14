import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DictionaryLab } from "@/features/admin/components/DictionaryLab";

export default async function AdminDictionaryPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("dance_library")
    .select("id, title, video_url, motion_dna, bpm, genre")
    .not("motion_dna", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const videos = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    video_url: r.video_url ?? "",
    motion_dna: r.motion_dna,
    bpm: r.bpm ?? null,
    genre: r.genre ?? null,
  }));

  return (
    <main className="container py-8">
      <p className="mb-4">
        <Link href="/admin" className="text-sm text-primary underline">
          ← Admin
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold">
        Biomechanical dictionary (Lab)
      </h1>
      <p className="mb-2 text-muted-foreground">
        View ideal move 3D playback and hip-tilt / foot-velocity over an 8-count
        measure.
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        Only videos with <strong>motion_dna</strong> appear here. Populate pose
        data (e.g. run your pose extraction pipeline or script that writes{" "}
        <code className="rounded bg-muted px-1">motion_dna</code> to{" "}
        <code className="rounded bg-muted px-1">dance_library</code>) for videos
        you want to see in Review with skeleton overlay and here in Dictionary
        Lab. Approving in Admin Review only sets status to
        &quot;published&quot;; it does not add motion_dna.
      </p>
      <DictionaryLab videos={videos} />
    </main>
  );
}

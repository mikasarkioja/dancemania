import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DictionaryLab } from "@/features/admin/components/DictionaryLab";

export default async function AdminDictionaryPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("dance_library")
    .select("id, title, video_url, motion_dna")
    .not("motion_dna", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const videos = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "",
    video_url: r.video_url ?? "",
    motion_dna: r.motion_dna,
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
      <p className="mb-6 text-muted-foreground">
        View ideal move 3D playback and hip-tilt / foot-velocity over an 8-count
        measure.
      </p>
      <DictionaryLab videos={videos} />
    </main>
  );
}

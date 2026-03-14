import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MoveExplorer } from "@/features/encyclopedia/components/MoveExplorer";
import { getAppGenre } from "@/lib/genre-server";

export default async function EncyclopediaPage() {
  const supabase = await createClient();
  const appGenre = await getAppGenre();
  const { data: rows } = await supabase
    .from("move_registry")
    .select(
      "id, name, category, role, description, teacher_tips, biomechanical_signature, biomechanical_profile, kinetic_chain, source_urls, status"
    )
    .or(`genre.eq.${appGenre},genre.is.null`)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const moves = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "",
    category: row.category ?? "",
    role: (row.role ?? "Both") as "Leader" | "Follower" | "Both",
    description: row.description ?? null,
    teacher_tips: row.teacher_tips ?? null,
    biomechanical_signature: row.biomechanical_signature ?? null,
    biomechanical_profile: row.biomechanical_profile ?? null,
    kinetic_chain: row.kinetic_chain ?? null,
    source_urls: Array.isArray(row.source_urls) ? row.source_urls : [],
    status: (row.status ?? "approved") as "approved" | "pending" | "candidate",
  }));

  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Move encyclopedia
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse moves by category. Each entry shows a motion signature and
            teacher tips when available.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          ← Home
        </Link>
      </div>
      <MoveExplorer moves={moves} />
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getAppGenre } from "@/lib/genre-server";
import Link from "next/link";

const STATUSES = [
  {
    key: "pending_analysis",
    label: "Pending extraction",
    hint: "Waiting for pose pipeline",
  },
  {
    key: "needs_labeling",
    label: "Ready to label",
    hint: "motion_dna ready",
  },
  {
    key: "needs_relabeling",
    label: "Needs relabeling",
    hint: "After review rejection",
  },
  {
    key: "published",
    label: "Published",
    hint: "Live for students",
  },
] as const;

export async function AdminSupplyChainStats() {
  const supabase = await createClient();
  const appGenre = await getAppGenre();

  const counts = await Promise.all(
    STATUSES.map(async (s) => {
      const { count, error } = await supabase
        .from("dance_library")
        .select("id", { count: "exact", head: true })
        .eq("genre", appGenre)
        .eq("status", s.key);
      return { ...s, count: error ? null : (count ?? 0) };
    })
  );

  return (
    <section
      className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-label="Supply chain overview"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-serif text-base font-semibold text-foreground">
          Queue overview
        </h2>
        <Link
          href="/admin/label"
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          Open label queue →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((c) => (
          <li
            key={c.key}
            className="rounded-lg border border-border/80 bg-background/60 px-3 py-2"
          >
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {c.count ?? "—"}
            </p>
            <p className="text-xs font-medium text-foreground">{c.label}</p>
            <p className="text-[11px] text-muted-foreground">{c.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

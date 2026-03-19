import Link from "next/link";
import { Suspense } from "react";
import { AdminUpload } from "@/features/admin";
import { AdminSupplyChainStats } from "@/features/admin/components/AdminSupplyChainStats";

const PIPELINE_STEPS = [
  {
    step: 1,
    title: "Upload",
    here: "/admin",
    detail:
      "Add metadata, partner seeds, and video file. Row starts as pending_analysis; extraction runs automatically if the service is configured.",
  },
  {
    step: 2,
    title: "Extraction",
    here: "Background (API)",
    detail:
      "process-dance-video writes motion_dna and sets needs_labeling. Requires EXTRACTION_SERVICE_URL and service role in production.",
  },
  {
    step: 3,
    title: "Label",
    here: "/admin/label",
    detail:
      "Add move segments and instruction overlays so students see timed coaching during practice.",
  },
  {
    step: 4,
    title: "Review & publish",
    here: "/admin/review/[id]",
    detail:
      "QA skeleton overlay and labels. Approve → published (visible in Library / Practice). Reject → needs_relabeling.",
  },
] as const;

export default function AdminPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Admin</h1>
      <p className="text-muted-foreground mt-1 mb-2">
        Upload, extract, label, and publish teacher videos for the student
        library.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        <span className="font-medium text-foreground">Students</span> only see
        videos with status{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">published</code>.
        Operator playbook:{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          docs/ACADEMY_ADMIN_VIDEO_WORKFLOW.md
        </code>
      </p>

      <section
        className="mb-10 rounded-2xl border border-border bg-card p-5 shadow-sm"
        aria-labelledby="pipeline-heading"
      >
        <h2 id="pipeline-heading" className="font-serif text-lg font-semibold">
          Supply chain: video → students
        </h2>
        <ol className="mt-4 space-y-4">
          {PIPELINE_STEPS.map((s) => (
            <li key={s.step} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {s.step}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.here}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/label"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Open label queue →
          </Link>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mb-8 h-24 animate-pulse rounded-2xl bg-muted/60" />
        }
      >
        <AdminSupplyChainStats />
      </Suspense>

      <nav className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/admin/label"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Label videos
        </Link>
        <Link
          href="/admin/dictionary"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Biomechanical dictionary (Lab) →
        </Link>
        <Link
          href="/admin/users"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          User management →
        </Link>
      </nav>
      <AdminUpload />
    </main>
  );
}

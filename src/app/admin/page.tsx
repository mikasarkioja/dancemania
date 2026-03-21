import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminUpload } from "@/features/admin";
import { AdminSupplyChainStats } from "@/features/admin/components/AdminSupplyChainStats";
import { StudioPulseBar } from "@/features/admin/components/StudioPulseBar";
import { SentinelHealthWidget } from "@/features/admin/components/SentinelHealthWidget";
import { AdminUserDirectory } from "@/features/admin/components/AdminUserDirectory";
import { TeacherPerformanceSection } from "@/features/admin/components/TeacherPerformanceSection";
import { TopMovesStudio } from "@/features/admin/components/TopMovesStudio";
import { fetchAdminDashboardData } from "@/features/admin/data/admin-dashboard";
import { isServerAdmin } from "@/lib/supabase/roles";
import {
  AdminMobileNav,
  AdminStudioSidebar,
} from "@/features/admin/components/AdminStudioSidebar";

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

export default async function AdminPage() {
  const ok = await isServerAdmin();
  if (!ok) {
    redirect("/dashboard");
  }

  const bundle = await fetchAdminDashboardData();

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-[#1a1a1c] text-white">
      <div className="mx-auto flex max-w-7xl">
        <AdminStudioSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8">
          <AdminMobileNav />
          <header className="mb-8 border-b border-white/10 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FDA4AF]/90">
              Master console
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-white">
              Studio pulse
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Consolidated roster, teacher engagement, top moves, and pipeline
              health — aggregated from profiles, practice sessions, dance
              library, and video usage logs.
            </p>
          </header>

          <StudioPulseBar pulse={bundle.pulse} />

          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SentinelHealthWidget />
            </div>
            <TopMovesStudio topMoves={bundle.topMoves} />
          </div>

          <div className="mb-8 space-y-8">
            <TeacherPerformanceSection rows={bundle.teacherRows} />
            <AdminUserDirectory users={bundle.directoryUsers} />
          </div>

          <section
            className="mb-10 rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.75)] p-5 backdrop-blur-xl"
            aria-labelledby="pipeline-heading"
          >
            <h2
              id="pipeline-heading"
              className="font-serif text-lg font-semibold text-white"
            >
              Supply chain: video → students
            </h2>
            <ol className="mt-4 space-y-4">
              {PIPELINE_STEPS.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDA4AF]/20 text-sm font-bold text-[#FDA4AF]">
                    {s.step}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-white">{s.title}</p>
                    <p className="mt-0.5 text-xs text-white/45">{s.here}</p>
                    <p className="mt-1 text-sm text-white/55">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/label"
                className="inline-flex items-center justify-center rounded-full bg-[#FDA4AF] px-5 py-2.5 text-sm font-medium text-[#1a1a1c] shadow-sm transition-colors hover:bg-[#FDA4AF]/90"
              >
                Open label queue →
              </Link>
              <Link
                href="/encyclopedia"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Move registry →
              </Link>
              <Link
                href="/admin#sentinel"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Diagnostic audit →
              </Link>
            </div>
          </section>

          <Suspense
            fallback={
              <div className="mb-8 h-24 animate-pulse rounded-2xl bg-white/5" />
            }
          >
            <AdminSupplyChainStats />
          </Suspense>

          <nav className="mb-8 flex flex-wrap gap-3">
            <Link
              href="/admin#directory"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              User directory
            </Link>
            <Link
              href="/admin/label"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Label videos
            </Link>
            <Link
              href="/admin/dictionary"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Biomechanical dictionary →
            </Link>
          </nav>

          <section className="rounded-2xl border border-[#FDA4AF]/20 bg-[rgba(40,40,42,0.5)] p-5 backdrop-blur-xl">
            <h2 className="font-serif text-lg font-semibold text-white">
              Ingest &amp; publish
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Students only see videos with status{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs text-[#FDA4AF]">
                published
              </code>
              . Playbook:{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                docs/ACADEMY_ADMIN_VIDEO_WORKFLOW.md
              </code>
            </p>
            <div className="mt-6 rounded-xl border border-border bg-background p-4 text-foreground shadow-sm">
              <AdminUpload />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

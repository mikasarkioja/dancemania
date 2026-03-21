import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isServerTeacherOrAdmin, isServerAdmin } from "@/lib/supabase/roles";
import {
  TeacherInsightsGrid,
  type TeacherVideoInsightRow,
} from "./TeacherInsightsGrid";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await isServerTeacherOrAdmin();
  if (!allowed) redirect("/dashboard");

  const admin = await isServerAdmin();

  let vQuery = supabase
    .from("dance_library")
    .select("id, title, slug, status, created_at")
    .order("created_at", { ascending: false });

  if (!admin) {
    vQuery = vQuery.eq("creator_id", user.id);
  }

  const { data: videos, error: vErr } = await vQuery;
  if (vErr) {
    return (
      <main className="container max-w-4xl py-8 text-destructive">
        Could not load videos: {vErr.message}
      </main>
    );
  }

  const videoList = videos ?? [];
  const ids = videoList.map((v) => v.id);

  type LogRow = { video_id: string; action_type: string };
  let logs: LogRow[] = [];
  if (ids.length > 0) {
    const { data: logRows } = await supabase
      .from("video_usage_logs")
      .select("video_id, action_type")
      .in("video_id", ids);
    logs = (logRows as LogRow[]) ?? [];
  }

  const statsByVideo = new Map<
    string,
    { views: number; starts: number; completes: number }
  >();
  for (const v of videoList) {
    statsByVideo.set(v.id, { views: 0, starts: 0, completes: 0 });
  }
  for (const row of logs) {
    const s = statsByVideo.get(row.video_id);
    if (!s) continue;
    if (row.action_type === "view") s.views += 1;
    else if (row.action_type === "practice_start") s.starts += 1;
    else if (row.action_type === "practice_complete") s.completes += 1;
  }

  const rows: TeacherVideoInsightRow[] = videoList.map((v) => {
    const s = statsByVideo.get(v.id)!;
    const rate = s.starts > 0 ? Math.round((s.completes / s.starts) * 100) : 0;
    return {
      id: v.id,
      title: v.title ?? "Untitled",
      slug: v.slug ?? "",
      status: v.status ?? null,
      createdAt: v.created_at ?? null,
      views: s.views,
      practiceStarts: s.starts,
      practiceCompletes: s.completes,
      completionRate: rate,
    };
  });

  return (
    <main className="dark min-h-svh bg-[#1a1a1c] pb-safe pt-safe">
      <div className="container max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#FDA4AF]/90">
              Teacher insights
            </p>
            <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
              Your studio analytics
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Views and practice completion from in-app telemetry (signed-in
              users).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/upload"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FDA4AF] px-4 text-sm font-medium text-[#1a1a1c] hover:opacity-90"
            >
              Upload move
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10"
            >
              Admin
            </Link>
            <Link
              href="/library"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10"
            >
              Library
            </Link>
          </div>
        </div>
        <TeacherInsightsGrid rows={rows} isAdmin={admin} />
      </div>
    </main>
  );
}

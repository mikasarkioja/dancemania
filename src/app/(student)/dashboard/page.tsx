import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/features/dashboard/components/DashboardView";

const BLOOM_GOAL_SESSIONS_PER_WEEK = 5;

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "dancer";

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("id, video_id, created_at, score_total")
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const sessionsList = sessions ?? [];

  const chartData = (() => {
    const byDay: Record<string, { total: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { total: 0, count: 0 };
    }
    sessionsList.forEach((s) => {
      const key = new Date(s.created_at).toISOString().slice(0, 10);
      if (byDay[key] != null) {
        byDay[key].total += Number(s.score_total ?? 0);
        byDay[key].count += 1;
      }
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, count }]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        harmonyScore: count > 0 ? Math.round(total / count) : 0,
      }));
  })();

  const weeklySessionCount = sessionsList.filter(
    (s) => new Date(s.created_at) >= weekStart
  ).length;
  const bloomProgress = Math.min(
    1,
    weeklySessionCount / BLOOM_GOAL_SESSIONS_PER_WEEK
  );

  const recentVideoIds = Array.from(
    new Map(sessionsList.map((s) => [s.video_id, s.created_at])).keys()
  ).slice(0, 10);

  let continueLearningVideos: {
    id: string;
    title: string;
    video_url: string;
    genre: string;
    difficulty: string;
    instructions: unknown[];
    slug: string | null;
    bpm: number | null;
  }[] = [];

  if (recentVideoIds.length > 0) {
    const { data: videos } = await supabase
      .from("dance_library")
      .select(
        "id, title, video_url, genre, difficulty, instructions, slug, bpm"
      )
      .in("id", recentVideoIds)
      .eq("status", "published");
    const order = new Map(recentVideoIds.map((id, i) => [id, i]));
    continueLearningVideos = (videos ?? [])
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((r) => ({
        id: r.id,
        title: r.title ?? "",
        video_url: r.video_url ?? "",
        genre: r.genre ?? "other",
        difficulty: r.difficulty ?? "beginner",
        instructions: Array.isArray(r.instructions) ? r.instructions : [],
        slug: r.slug ?? null,
        bpm: r.bpm ?? null,
      }));
  }

  const { data: moveRows } = await supabase
    .from("move_registry")
    .select("id, name, category")
    .eq("status", "approved")
    .limit(50);
  const moves = moveRows ?? [];
  const moveOfTheDay =
    moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;

  return (
    <DashboardView
      userName={userName}
      bloomProgress={bloomProgress}
      chartData={chartData}
      continueLearningVideos={continueLearningVideos}
      moveOfTheDay={
        moveOfTheDay
          ? {
              id: moveOfTheDay.id,
              name: moveOfTheDay.name ?? "",
              category: moveOfTheDay.category ?? "",
            }
          : null
      }
    />
  );
}

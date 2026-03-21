import { createClient } from "@/lib/supabase/server";
import { getPersonaFromXp } from "@/lib/dashboard/persona";
import type { Persona } from "@/lib/dashboard/persona";

export interface StudioPulseStats {
  totalDancers: number;
  activeTeachers: number;
  totalPractices: number;
  avgPrecision: number;
}

export interface AdminDirectoryUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "teacher" | "admin";
  omatase: number;
  persona: Persona;
  practice_count: number;
  created_at: string | null;
}

export interface TeacherPerformanceRow {
  id: string;
  displayName: string;
  email: string | null;
  videoCount: number;
  totalViews: number;
  totalPracticesOnVideos: number;
  /** Practices per view; null when there are no logged views (ratio undefined). */
  practiceToViewRatio: number | null;
}

export interface TopPracticedVideo {
  videoId: string;
  title: string;
  practiceCount: number;
}

export interface AdminDashboardBundle {
  pulse: StudioPulseStats;
  directoryUsers: AdminDirectoryUser[];
  teacherRows: TeacherPerformanceRow[];
  topMoves: TopPracticedVideo[];
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardBundle> {
  const supabase = await createClient();

  const [
    dancersRes,
    teachersRes,
    practicesRes,
    scoresRes,
    profilesRes,
    sessionsRes,
    libraryRes,
    logsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher"),
    supabase
      .from("practice_sessions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("practice_sessions")
      .select("score_total")
      .not("score_total", "is", null),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, omatase, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("practice_sessions").select("user_id, video_id"),
    supabase.from("dance_library").select("id, title, creator_id"),
    supabase
      .from("video_usage_logs")
      .select("video_id, action_type")
      .eq("action_type", "view"),
  ]);

  const totalDancers = dancersRes.count ?? 0;
  const activeTeachers = teachersRes.count ?? 0;
  const totalPractices = practicesRes.count ?? 0;

  const scoreRows = scoresRes.data ?? [];
  const avgPrecision =
    scoreRows.length > 0
      ? Math.round(
          scoreRows.reduce((acc, r) => acc + Number(r.score_total ?? 0), 0) /
            scoreRows.length
        )
      : 0;

  const profiles = profilesRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const videos = libraryRes.data ?? [];
  const viewLogs = logsRes.data ?? [];

  const sessionCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    sessionCounts[s.user_id] = (sessionCounts[s.user_id] ?? 0) + 1;
  });

  const practiceCountByVideo: Record<string, number> = {};
  sessions.forEach((s) => {
    practiceCountByVideo[s.video_id] =
      (practiceCountByVideo[s.video_id] ?? 0) + 1;
  });

  const viewCountByVideo: Record<string, number> = {};
  viewLogs.forEach((l) => {
    viewCountByVideo[l.video_id] = (viewCountByVideo[l.video_id] ?? 0) + 1;
  });

  const videoMeta = new Map(
    videos.map((v) => [
      v.id,
      {
        title: v.title ?? "Untitled",
        creator_id: v.creator_id as string | null,
      },
    ])
  );

  const directoryUsers: AdminDirectoryUser[] = profiles.map((p) => {
    const omatase = Number(p.omatase ?? 0);
    return {
      id: p.id,
      full_name: p.full_name ?? null,
      email: p.email ?? null,
      role: (p.role as AdminDirectoryUser["role"]) ?? "student",
      omatase,
      persona: getPersonaFromXp(omatase),
      practice_count: sessionCounts[p.id] ?? 0,
      created_at: p.created_at ?? null,
    };
  });

  const teacherProfiles = profiles.filter((p) => p.role === "teacher");
  const teacherRows: TeacherPerformanceRow[] = teacherProfiles.map((t) => {
    const ownedVideoIds = videos
      .filter((v) => v.creator_id === t.id)
      .map((v) => v.id);
    let totalViews = 0;
    let totalPracticesOnVideos = 0;
    for (const vid of ownedVideoIds) {
      totalViews += viewCountByVideo[vid] ?? 0;
      totalPracticesOnVideos += practiceCountByVideo[vid] ?? 0;
    }
    const practiceToViewRatio =
      totalViews > 0
        ? Math.round((totalPracticesOnVideos / totalViews) * 1000) / 1000
        : null;

    return {
      id: t.id,
      displayName: t.full_name?.trim() || t.email || "Teacher",
      email: t.email ?? null,
      videoCount: ownedVideoIds.length,
      totalViews,
      totalPracticesOnVideos,
      practiceToViewRatio,
    };
  });

  const topMoves: TopPracticedVideo[] = Object.entries(practiceCountByVideo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([videoId, practiceCount]) => ({
      videoId,
      title: videoMeta.get(videoId)?.title ?? "Video",
      practiceCount,
    }));

  return {
    pulse: {
      totalDancers,
      activeTeachers,
      totalPractices,
      avgPrecision,
    },
    directoryUsers,
    teacherRows,
    topMoves,
  };
}

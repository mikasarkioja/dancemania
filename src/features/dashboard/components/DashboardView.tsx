"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, Sparkles, Flower2, ChevronRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WelcomeKit } from "@/features/onboarding/components/WelcomeKit";
import { BloomGarden } from "@/features/dashboard/components/BloomGarden";
import { MotionDNAChart } from "@/features/dashboard/components/MotionDNAChart";
import type { MotionDnaRadarPoint } from "@/lib/dashboard/motion-dna";
import type { ComparisonJointGroup } from "@/features/practice/actions/session-actions";

export interface ChartPoint {
  date: string;
  harmonyScore: number;
}

export interface ContinueVideo {
  id: string;
  title: string;
  video_url: string;
  genre: string;
  difficulty: string;
  instructions: unknown[];
  slug: string | null;
  bpm: number | null;
}

export interface MoveOfTheDay {
  id: string;
  name: string;
  category: string;
}

/** Recent practice sessions (Creative Director session names). */
export interface RecentSession {
  id: string;
  videoId: string;
  createdAt: string;
  scoreTotal: number;
  sessionName: string;
}

/** Free practice usage for session counter (null = admin/teacher bypass, hide counter). */
export interface PracticeEntitlement {
  currentCount: number;
  remaining: number;
}

/** Recent session with Sentinel Insight (worst joint group) for coaching link. */
export interface RecentActivityWithInsight {
  id: string;
  videoId: string;
  createdAt: string;
  scoreTotal: number;
  sessionName: string;
  worstJointGroup: ComparisonJointGroup | null;
  harmonyScore: number;
}

export interface DashboardViewProps {
  userName: string;
  bloomProgress: number;
  chartData: ChartPoint[];
  continueLearningVideos: ContinueVideo[];
  recentSessions?: RecentSession[];
  /** Last few sessions with worstJointGroup for Sentinel Insight and link to session coaching. */
  recentActivityWithInsight?: RecentActivityWithInsight[];
  omatase?: number;
  persona?: string;
  motionDnaRadarData?: MotionDnaRadarPoint[];
  moveOfTheDay: MoveOfTheDay | null;
  /** Show the Test User Welcome Kit overlay (first authenticated session, non-admin). */
  shouldShowWelcomeKit?: boolean;
  /** Free practices used/remaining; null = unlimited (admin/teacher), don't show counter. */
  practiceEntitlement?: PracticeEntitlement | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const FREE_PRACTICE_LIMIT = 3;

function sentinelInsightLabel(worst: ComparisonJointGroup | null): string {
  if (!worst) return "General focus";
  switch (worst) {
    case "Hips":
      return "Hip timing";
    case "Feet":
      return "Footwork";
    case "Frame":
      return "Frame";
    default:
      return "Movement";
  }
}

export function DashboardView({
  userName,
  bloomProgress,
  chartData,
  continueLearningVideos,
  recentSessions = [],
  recentActivityWithInsight = [],
  omatase = 0,
  persona = "Seedling",
  motionDnaRadarData = [],
  moveOfTheDay,
  shouldShowWelcomeKit = false,
  practiceEntitlement = null,
}: DashboardViewProps) {
  const showEmptyState =
    omatase === 0 && recentActivityWithInsight.length === 0;

  return (
    <main className="dark min-h-svh bg-[#1a1a1c] pt-safe pb-safe">
      {shouldShowWelcomeKit && <WelcomeKit />}
      <div className="container mx-auto max-w-2xl px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Empty state: 0 XP — First Step CTA to Assessment */}
          {showEmptyState && (
            <motion.section variants={item}>
              <div className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.85)] p-6 text-center shadow-xl backdrop-blur-xl">
                <p className="font-serif text-lg font-bold text-foreground">
                  Your garden awaits
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Take your first step—complete the Assessment to unlock your
                  Omatase and grow your Bloom Garden.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-full bg-[#FDA4AF] px-6 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-90 tap-scale"
                >
                  First Step — Start Assessment
                </Link>
              </div>
            </motion.section>
          )}

          {/* Session counter: X of 3 Free Practices Remaining */}
          {practiceEntitlement != null && (
            <motion.section variants={item}>
              <div className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.8)] p-3 shadow-sm backdrop-blur-xl">
                <p className="text-xs font-medium text-muted-foreground">
                  {practiceEntitlement.remaining === 0
                    ? "Free practices used"
                    : "Free practices remaining"}
                </p>
                <p className="mt-0.5 font-serif text-sm font-medium text-foreground">
                  {practiceEntitlement.remaining === 0
                    ? `${Math.min(practiceEntitlement.currentCount, FREE_PRACTICE_LIMIT)} of ${FREE_PRACTICE_LIMIT} used`
                    : `${practiceEntitlement.remaining} of ${FREE_PRACTICE_LIMIT} remaining`}
                </p>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-champagne/80"
                  role="progressbar"
                  aria-valuenow={practiceEntitlement.remaining}
                  aria-valuemin={0}
                  aria-valuemax={FREE_PRACTICE_LIMIT}
                >
                  <div
                    className="h-full rounded-full bg-brand-gold/90 transition-all duration-300"
                    style={{
                      width: `${(practiceEntitlement.remaining / FREE_PRACTICE_LIMIT) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </motion.section>
          )}

          {/* Header + Activity Ring */}
          <motion.header
            variants={item}
            className="relative flex items-start justify-between gap-4"
          >
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back to the studio, {userName} ✨
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-[rgba(40,40,42,0.8)] text-foreground shadow-sm backdrop-blur-xl transition hover:bg-[rgba(50,50,52,0.9)]"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <ActivityRing progress={bloomProgress} />
            </div>
          </motion.header>

          {/* Bloom Garden — central glassmorphic card */}
          <motion.section variants={item}>
            <BloomGarden omatase={omatase} persona={persona} />
          </motion.section>

          {/* Motion DNA Radar */}
          <motion.section variants={item}>
            <div className="rounded-2xl border border-white/10 bg-[rgba(30,30,32,0.75)] p-4 shadow-xl backdrop-blur-xl sm:p-5">
              <h2 className="font-serif text-lg font-bold text-foreground">
                Motion DNA
              </h2>
              <p className="text-sm text-muted-foreground">
                Your movement profile across key dimensions
              </p>
              <div className="mt-4">
                <MotionDNAChart
                  data={
                    motionDnaRadarData.length > 0
                      ? motionDnaRadarData
                      : [
                          { axis: "Hips", value: 50, fullMark: 100 },
                          { axis: "Feet", value: 50, fullMark: 100 },
                          { axis: "Posture", value: 50, fullMark: 100 },
                          { axis: "Timing", value: 50, fullMark: 100 },
                          { axis: "Flow", value: 50, fullMark: 100 },
                        ]
                  }
                />
              </div>
            </div>
          </motion.section>

          {/* Move of the Day - thumb-friendly, first after header */}
          {moveOfTheDay && (
            <motion.section variants={item}>
              <div className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.8)] p-5 shadow-sm backdrop-blur-xl">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Move of the day
                </p>
                <h2 className="mt-1 font-serif text-xl font-bold text-foreground">
                  {moveOfTheDay.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {moveOfTheDay.category}
                </p>
                <Link
                  href="/encyclopedia"
                  className="mt-4 inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-brand-rose px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 tap-scale"
                >
                  Practice now
                </Link>
              </div>
            </motion.section>
          )}

          {/* Weekly Bloom chart */}
          <motion.section variants={item}>
            <div className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.8)] p-4 shadow-sm backdrop-blur-xl sm:p-5">
              <h2 className="font-serif text-lg font-bold text-foreground">
                Your week
              </h2>
              <p className="text-sm text-muted-foreground">
                Harmony score over the last 7 days
              </p>
              <div className="mt-4 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="bloom-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FDA4AF"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="#FDA4AF"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,0,0,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                      formatter={(value: unknown) => [
                        value != null ? `${value}%` : "",
                        "Harmony",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="harmonyScore"
                      stroke="#FDA4AF"
                      strokeWidth={2}
                      fill="url(#bloom-gradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.section>

          {/* Recent activity — Sentinel Insight + link to session CoachingCard */}
          {(recentActivityWithInsight.length > 0 ||
            recentSessions.length > 0) && (
            <motion.section variants={item}>
              <h2 className="font-serif text-lg font-bold text-foreground">
                Recent activity
              </h2>
              <p className="text-sm text-muted-foreground">
                Your practice sessions and Sentinel Insight
              </p>
              <ul className="mt-3 space-y-2">
                {recentActivityWithInsight.length > 0
                  ? recentActivityWithInsight.map((session) => (
                      <li key={session.id}>
                        <Link
                          href={`/session/${session.id}`}
                          className="flex min-h-[44px] touch-manipulation items-center gap-3 rounded-xl border border-white/10 bg-[rgba(40,40,42,0.8)] px-4 py-3 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md tap-scale"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block font-medium text-foreground">
                              {session.sessionName}
                            </span>
                            <span className="mt-0.5 block text-xs text-[#FDA4AF]/90">
                              Sentinel:{" "}
                              {sentinelInsightLabel(session.worstJointGroup)}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-medium text-muted-foreground">
                            {session.scoreTotal}%
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(session.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))
                  : recentSessions.map((session) => (
                      <li key={session.id}>
                        <Link
                          href={`/practice/${session.videoId}`}
                          className="flex min-h-[44px] touch-manipulation items-center justify-between rounded-xl border border-white/10 bg-[rgba(40,40,42,0.8)] px-4 py-3 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md tap-scale"
                        >
                          <span className="font-medium text-foreground">
                            {session.sessionName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {session.scoreTotal}%
                          </span>
                        </Link>
                      </li>
                    ))}
              </ul>
            </motion.section>
          )}

          {/* Continue Learning carousel */}
          <motion.section variants={item}>
            <h2 className="font-serif text-lg font-bold text-foreground">
              Continue learning
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick up where you left off
            </p>
            {continueLearningVideos.length > 0 ? (
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {continueLearningVideos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/practice/${video.id}`}
                    className="group flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation tap-scale"
                  >
                    <div className="w-[160px] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.8)] shadow-sm backdrop-blur-xl transition-shadow group-hover:shadow-md">
                      <div className="relative aspect-video bg-muted">
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-md"
                          style={{
                            backgroundImage: `url(${video.video_url})`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Flower2 className="h-8 w-8 text-brand-rose/90 drop-shadow" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
                          {video.title}
                        </h3>
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                          {video.genre}
                          {video.bpm != null && (
                            <span className="ml-1">· {video.bpm} BPM</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.8)] p-6 text-center backdrop-blur-xl">
                <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No sessions yet. Start from the library.
                </p>
                <Link
                  href="/library"
                  className="mt-3 inline-block text-sm font-medium text-primary"
                >
                  Browse library →
                </Link>
              </div>
            )}
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}

function ActivityRing({ progress }: { progress: number }) {
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative shrink-0" aria-hidden>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ filter: "drop-shadow(0 0 8px rgba(253,164,175,0.4))" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FDA4AF"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
    </div>
  );
}

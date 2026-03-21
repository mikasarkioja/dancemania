"use client";

import Link from "next/link";

export interface TeacherVideoInsightRow {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  createdAt: string | null;
  views: number;
  practiceStarts: number;
  practiceCompletes: number;
  completionRate: number;
}

export function TeacherInsightsGrid({
  rows,
  isAdmin,
}: {
  rows: TeacherVideoInsightRow[];
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.85)] p-8 text-center backdrop-blur-xl">
          <p className="text-muted-foreground">
            No videos yet. Upload from{" "}
            <Link href="/admin" className="text-[#FDA4AF] underline">
              Admin
            </Link>{" "}
            to become the creator.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((v) => (
            <li
              key={v.id}
              className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.9)] p-5 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-lg font-semibold text-white">
                    {v.title}
                  </h2>
                  <p className="truncate text-xs text-white/50">{v.slug}</p>
                  <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#FDA4AF]">
                    {v.status ?? "—"}
                  </span>
                </div>
                <Link
                  href={`/admin/review/${v.id}`}
                  className="shrink-0 text-xs font-medium text-[#FDA4AF] underline"
                >
                  Review
                </Link>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-black/25 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-white/50">
                    Views
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-white">
                    {v.views}
                  </dd>
                </div>
                <div className="rounded-xl bg-black/25 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-white/50">
                    Started
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-white">
                    {v.practiceStarts}
                  </dd>
                </div>
                <div className="rounded-xl bg-black/25 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-white/50">
                    Complete %
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-[#FDA4AF]">
                    {v.completionRate}%
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-white/45">
                Completion rate = practice completes ÷ practice starts (logged
                sessions).
              </p>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && rows.length > 0 && (
        <p className="text-center text-xs text-white/40">
          Admin view: showing all library videos and aggregate analytics.
        </p>
      )}
    </div>
  );
}

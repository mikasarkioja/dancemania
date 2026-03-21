import type { TeacherPerformanceRow } from "@/features/admin/data/admin-dashboard";

export function TeacherPerformanceSection({
  rows,
}: {
  rows: TeacherPerformanceRow[];
}) {
  const sorted = [...rows].sort((a, b) => b.videoCount - a.videoCount);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.75)] p-5 backdrop-blur-xl"
      aria-labelledby="teacher-perf-heading"
    >
      <h2
        id="teacher-perf-heading"
        className="font-serif text-xl font-semibold text-white"
      >
        Teacher performance
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Uploads, logged views, practices on their videos, and practice-to-view
        ratio.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
              <th className="pb-2 pr-3 font-medium">Teacher</th>
              <th className="pb-2 pr-3 font-medium">Videos</th>
              <th className="pb-2 pr-3 font-medium">Views</th>
              <th className="pb-2 pr-3 font-medium">Practices</th>
              <th className="pb-2 font-medium">Practice / view</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-white/45">
                  No teachers with{" "}
                  <code className="text-[#FDA4AF]">teacher</code> role yet.
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/5 text-white/85"
                >
                  <td className="py-3 pr-3">
                    <span className="font-medium text-white">
                      {t.displayName}
                    </span>
                    {t.email && (
                      <span className="mt-0.5 block text-xs text-white/40">
                        {t.email}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{t.videoCount}</td>
                  <td className="py-3 pr-3 tabular-nums">{t.totalViews}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {t.totalPracticesOnVideos}
                  </td>
                  <td className="py-3 font-medium text-[#FDA4AF] tabular-nums">
                    {t.practiceToViewRatio != null
                      ? t.practiceToViewRatio.toFixed(2)
                      : t.totalPracticesOnVideos > 0
                        ? `${t.totalPracticesOnVideos} / 0 views`
                        : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

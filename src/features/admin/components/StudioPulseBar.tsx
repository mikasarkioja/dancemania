import type { StudioPulseStats } from "@/features/admin/data/admin-dashboard";

export function StudioPulseBar({ pulse }: { pulse: StudioPulseStats }) {
  const items = [
    { label: "Total dancers", value: pulse.totalDancers, hint: "Student role" },
    {
      label: "Active teachers",
      value: pulse.activeTeachers,
      hint: "Teacher role",
    },
    {
      label: "Total practices",
      value: pulse.totalPractices,
      hint: "All sessions",
    },
    {
      label: "Avg. precision",
      value: `${pulse.avgPrecision}%`,
      hint: "Global harmony avg.",
    },
  ] as const;

  return (
    <section
      className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Studio pulse"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[#FDA4AF]/25 bg-[rgba(40,40,42,0.75)] p-4 shadow-lg backdrop-blur-xl"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FDA4AF]/90">
            {item.label}
          </p>
          <p className="mt-1 font-serif text-3xl font-bold tabular-nums text-white">
            {item.value}
          </p>
          <p className="mt-0.5 text-xs text-white/45">{item.hint}</p>
        </div>
      ))}
    </section>
  );
}

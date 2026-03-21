import Link from "next/link";
import type { TopPracticedVideo } from "@/features/admin/data/admin-dashboard";

export function TopMovesStudio({
  topMoves,
}: {
  topMoves: TopPracticedVideo[];
}) {
  return (
    <section className="rounded-2xl border border-[#FDA4AF]/20 bg-[rgba(40,40,42,0.75)] p-5 backdrop-blur-xl">
      <h2 className="font-serif text-xl font-semibold text-white">
        Top moves in the studio
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Three most-practiced videos by session count.
      </p>
      <ol className="mt-4 space-y-3">
        {topMoves.length === 0 ? (
          <li className="text-sm text-white/45">No practice data yet.</li>
        ) : (
          topMoves.map((m, i) => (
            <li
              key={m.videoId}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDA4AF]/25 text-sm font-bold text-[#FDA4AF]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{m.title}</p>
                  <p className="text-xs text-white/45 tabular-nums">
                    {m.practiceCount} practices
                  </p>
                </div>
              </div>
              <Link
                href={`/practice/${m.videoId}`}
                className="shrink-0 text-xs font-medium text-[#FDA4AF] underline"
              >
                Open
              </Link>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

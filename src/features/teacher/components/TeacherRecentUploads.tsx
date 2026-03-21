"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type TeacherUploadListRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function statusHeadline(status: string | null): string {
  const s = (status ?? "").trim();
  switch (s) {
    case "processing":
    case "pending_analysis":
      return "AI extraction";
    case "needs_labeling":
      return "Ready for labeling";
    case "needs_relabeling":
      return "Labels need update";
    case "pending_admin_approval":
      return "Gold-standard review";
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    default:
      return s || "Unknown";
  }
}

function useProcessingPhase(status: string | null, active: boolean) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 4000);
    return () => clearInterval(t);
  }, [active]);
  const extracting = status === "processing" || status === "pending_analysis";
  if (!extracting) return statusHeadline(status);
  const copy = [
    "Scanning skeleton…",
    "Generating Motion DNA…",
    "Finishing pose track…",
  ];
  return copy[phase % copy.length];
}

export function TeacherRecentUploads({
  userId,
  initialRows,
}: {
  userId: string;
  initialRows: TeacherUploadListRow[];
}) {
  const [rows, setRows] = useState<TeacherUploadListRow[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`teacher-library-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dance_library",
          filter: `creator_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const n = payload.new as TeacherUploadListRow;
            setRows((prev) => {
              const next = [
                {
                  id: n.id,
                  title: n.title,
                  status: n.status,
                  created_at: n.created_at,
                  updated_at: n.updated_at,
                },
                ...prev.filter((r) => r.id !== n.id),
              ];
              return next.slice(0, 25);
            });
          }
          if (payload.eventType === "UPDATE" && payload.new) {
            const n = payload.new as TeacherUploadListRow;
            setRows((prev) =>
              prev.map((r) =>
                r.id === n.id
                  ? {
                      ...r,
                      title: n.title ?? r.title,
                      status: n.status ?? r.status,
                      updated_at: n.updated_at ?? r.updated_at,
                    }
                  : r
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const ta = new Date(a.created_at ?? 0).getTime();
        const tb = new Date(b.created_at ?? 0).getTime();
        return tb - ta;
      }),
    [rows]
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <h2 className="font-serif text-xl font-semibold text-white">
        My recent uploads
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Live status via Supabase Realtime — open labeling when extraction
        completes.
      </p>
      <ul className="mt-4 space-y-3">
        {sorted.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
            No uploads yet. Drop your first move above.
          </li>
        ) : (
          sorted.map((row) => <TeacherUploadRow key={row.id} row={row} />)
        )}
      </ul>
    </section>
  );
}

function TeacherUploadRow({ row }: { row: TeacherUploadListRow }) {
  const extracting =
    row.status === "processing" || row.status === "pending_analysis";
  const phaseLabel = useProcessingPhase(row.status, extracting);

  const showMal =
    row.status === "needs_labeling" || row.status === "needs_relabeling";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">
          {row.title ?? "Untitled"}
        </p>
        <p
          className={cn(
            "mt-1 text-sm",
            extracting ? "text-[#FDA4AF]" : "text-white/50"
          )}
        >
          {phaseLabel}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/35">
          {row.status}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {showMal ? (
          <Link
            href={`/admin/label/${row.id}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#FDA4AF] px-4 text-sm font-semibold text-[#1a1a1c] hover:opacity-90"
          >
            Review AI labels
          </Link>
        ) : null}
        {row.status === "pending_admin_approval" ? (
          <span className="inline-flex min-h-[40px] items-center rounded-full border border-[#FDA4AF]/40 px-4 text-sm text-[#FDA4AF]">
            In master review queue
          </span>
        ) : null}
      </div>
    </li>
  );
}

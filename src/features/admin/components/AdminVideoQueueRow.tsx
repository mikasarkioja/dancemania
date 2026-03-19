"use client";

import Link from "next/link";
import { AdminVideoPipelineSteps } from "@/features/admin/components/AdminVideoPipelineSteps";
import { RetryExtractionButton } from "@/features/admin/components/RetryExtractionButton";
import {
  countCompletedSteps,
  pipelineProgressSummary,
  type PipelineStepDerived,
} from "@/lib/admin/video-pipeline-state";

export interface AdminVideoQueueRowProps {
  videoId: string;
  title: string;
  slug: string;
  status: string | null | undefined;
  hasMotionDna: boolean;
  steps: PipelineStepDerived[];
}

export function AdminVideoQueueRow({
  videoId,
  title,
  slug,
  status,
  hasMotionDna,
  steps,
}: AdminVideoQueueRowProps) {
  const completed = countCompletedSteps(steps);
  const summary = pipelineProgressSummary(steps, status);
  const showRetry = status === "pending_analysis" && !hasMotionDna;

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/label/${videoId}`}
              className="font-medium text-foreground hover:underline"
            >
              {title}
            </Link>
            <span className="text-xs text-muted-foreground">
              {completed}/4 steps
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{slug}</p>
          <p className="mt-2 text-xs text-muted-foreground">{summary}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Link
            href={`/admin/label/${videoId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Label
          </Link>
          <Link
            href={`/admin/review/${videoId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Review / Publish
          </Link>
        </div>
      </div>
      <AdminVideoPipelineSteps
        steps={steps}
        variant="compact"
        className="justify-start"
      />
      {showRetry && (
        <RetryExtractionButton
          videoId={videoId}
          className="border-t border-border pt-3"
        />
      )}
    </li>
  );
}

"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PipelineStepDerived,
  StepVisualState,
} from "@/lib/admin/video-pipeline-state";

export interface AdminVideoPipelineStepsProps {
  steps: PipelineStepDerived[];
  /** Smaller row layout for list cards */
  variant?: "full" | "compact";
  className?: string;
}

function StepIcon({
  done,
  visual,
  needsRevisit,
}: {
  done: boolean;
  visual: StepVisualState;
  needsRevisit?: boolean;
}) {
  if (done && visual !== "current") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
        <Check className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (visual === "current") {
    const warn = needsRevisit;
    return (
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-sm ring-2",
          warn
            ? "border-amber-600 bg-amber-500/15 ring-amber-500/30"
            : "border-primary bg-primary/10 ring-primary/25"
        )}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            warn ? "bg-amber-600" : "bg-primary"
          )}
          aria-hidden
        />
      </span>
    );
  }
  if (visual === "blocked") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-muted text-muted-foreground">
        <Circle className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground">
      <Circle className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function AdminVideoPipelineSteps({
  steps,
  variant = "full",
  className,
}: AdminVideoPipelineStepsProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        role="list"
        aria-label="Video pipeline progress"
      >
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className={cn(
                  "h-0.5 w-4 rounded-full sm:w-6",
                  steps[i - 1]?.done ? "bg-emerald-500/80" : "bg-border"
                )}
                aria-hidden
              />
            )}
            <div
              role="listitem"
              className="flex flex-col items-center gap-0.5"
              title={`${step.title}: ${step.description}`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                  step.done && step.visual !== "current"
                    ? "bg-emerald-600 text-white"
                    : step.visual === "current"
                      ? step.needsRevisit
                        ? "bg-amber-600 text-white"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {step.done && step.visual !== "current" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden text-[9px] text-muted-foreground sm:inline">
                {step.shortTitle}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      aria-label="Video pipeline steps"
    >
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            "relative flex gap-3",
            step.visual === "current" &&
              "rounded-lg bg-primary/5 ring-1 ring-primary/20"
          )}
        >
          <div className="flex shrink-0 flex-col items-center">
            <StepIcon
              done={step.done}
              visual={step.visual}
              needsRevisit={step.needsRevisit}
            />
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-sm font-semibold text-foreground">
              {step.title}
            </p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
            {step.visual === "current" && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  step.needsRevisit
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-primary"
                )}
              >
                {step.needsRevisit ? "Action required" : "Current step"}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

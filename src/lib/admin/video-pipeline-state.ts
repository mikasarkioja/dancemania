/**
 * Derives admin supply-chain step completion for teacher videos (dance_library).
 * Used to show progress: Upload → Extraction → Labeling → Review/Publish.
 */

export type PipelineStepId = "upload" | "extraction" | "labeling" | "publish";

export type StepVisualState = "complete" | "current" | "upcoming" | "blocked";

export interface PipelineStepDerived {
  id: PipelineStepId;
  title: string;
  shortTitle: string;
  description: string;
  done: boolean;
  visual: StepVisualState;
  /** True when step is complete but must be revisited (e.g. needs_relabeling). */
  needsRevisit?: boolean;
}

export interface VideoPipelineInput {
  status: string | null | undefined;
  hasMotionDna: boolean;
  /** Number of move segments saved in instructions JSON */
  instructionSegmentCount: number;
}

function statusNorm(s: string | null | undefined): string {
  return (s ?? "").trim() || "draft";
}

/**
 * Compute the four canonical steps and which is "current" for the operator.
 */
export function computeVideoPipelineSteps(
  input: VideoPipelineInput
): PipelineStepDerived[] {
  const status = statusNorm(input.status);

  const uploadDone = true;

  const extractionDone =
    input.hasMotionDna ||
    status === "needs_labeling" ||
    status === "needs_relabeling" ||
    status === "published" ||
    status === "pending_admin_approval";

  const labelingDone = input.instructionSegmentCount > 0;

  const publishDone = status === "published";

  let extractionVisual: StepVisualState = "upcoming";
  let labelingVisual: StepVisualState = "upcoming";
  let publishVisual: StepVisualState = "upcoming";

  if (!extractionDone) {
    extractionVisual =
      status === "pending_analysis" || status === "processing"
        ? "current"
        : "blocked";
    labelingVisual = "blocked";
    publishVisual = "blocked";
  } else if (status === "needs_relabeling") {
    extractionVisual = "complete";
    labelingVisual = "current";
    publishVisual = "upcoming";
  } else if (!labelingDone) {
    extractionVisual = "complete";
    labelingVisual = status === "needs_labeling" ? "current" : "upcoming";
    publishVisual = "upcoming";
  } else if (!publishDone) {
    extractionVisual = "complete";
    labelingVisual = "complete";
    publishVisual = "current";
  } else {
    extractionVisual = "complete";
    labelingVisual = "complete";
    publishVisual = "complete";
  }

  const uploadVisual: StepVisualState = uploadDone ? "complete" : "current";

  const labelingNeedsRevisit = status === "needs_relabeling";

  return [
    {
      id: "upload",
      title: "Upload",
      shortTitle: "Upload",
      description: "Video file and metadata in the library",
      done: uploadDone,
      visual: uploadVisual,
    },
    {
      id: "extraction",
      title: "Pose extraction",
      shortTitle: "Extract",
      description: "motion_dna from the processing service",
      done: extractionDone,
      visual: extractionVisual,
    },
    {
      id: "labeling",
      title: "Label & instructions",
      shortTitle: "Label",
      description: labelingNeedsRevisit
        ? "Update segments after review feedback"
        : "Move segments and overlay copy for students",
      done: labelingDone,
      visual: labelingVisual,
      needsRevisit: labelingNeedsRevisit,
    },
    {
      id: "publish",
      title: "Review & publish",
      shortTitle: "Publish",
      description: "QA then approve for student Library",
      done: publishDone,
      visual: publishVisual,
    },
  ];
}

/** Human-readable “where you are” for list rows and banners. */
export function pipelineProgressSummary(
  steps: PipelineStepDerived[],
  status?: string | null
): string {
  const s = statusNorm(status);
  if (s === "published") {
    return "All steps complete — video is published for students.";
  }
  if (s === "pending_admin_approval") {
    return "Submitted for gold-standard review — a master admin will verify and publish.";
  }

  const current = steps.find(
    (x) => x.visual === "current" || x.visual === "blocked"
  );

  if (s === "needs_relabeling") {
    return "Reviewer requested changes — fix labels, then Review / Publish again.";
  }

  if (!current) {
    return "All steps complete — open Review if not yet published.";
  }
  if (current.id === "extraction" && current.visual === "blocked") {
    return "Complete pose extraction before labeling.";
  }
  switch (current.id) {
    case "extraction":
      return "Waiting for pose extraction — retry if it’s stuck.";
    case "labeling":
      return "Add move segments and save instructions.";
    case "publish":
      return "Labels saved — open Review to publish for students.";
    default:
      return "Continue the pipeline from the Admin home.";
  }
}

export function countCompletedSteps(steps: PipelineStepDerived[]): number {
  return steps.filter((s) => s.done).length;
}

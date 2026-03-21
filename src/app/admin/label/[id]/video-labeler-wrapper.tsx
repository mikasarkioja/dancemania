"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  DanceInstructions,
  MotionDNA,
  SuggestedLabel,
} from "@/types/dance";
import type { SalsaAgentMetadata } from "@/types/mal";
import { generateMockSalsaAgentProposals } from "@/lib/mal/mock-salsa-agent";
import {
  VideoLabeler,
  LabelVerificationStack,
  LabelVerificationStackMAL,
} from "@/features/admin";
import { AdminVideoPipelineSteps } from "@/features/admin/components/AdminVideoPipelineSteps";
import { RetryExtractionButton } from "@/features/admin/components/RetryExtractionButton";
import {
  pipelineProgressSummary,
  type PipelineStepDerived,
} from "@/lib/admin/video-pipeline-state";
import {
  runAutoLabel,
  approveSuggestedLabel,
  rejectSuggestedLabel,
} from "@/features/admin/actions/label-actions";
import { submitTeacherVideoForApproval } from "@/features/teacher/actions/teacher-upload-actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface VideoLabelerWrapperProps {
  videoId: string;
  videoUrl: string;
  title: string;
  initialInstructions: DanceInstructions;
  motionDna?: MotionDNA | null;
  suggestedLabels?: SuggestedLabel[];
  patterns?: string[];
  /** If false, show banner: Save requires sign-in. */
  isAuthenticated?: boolean;
  bpm?: number | null;
  genre?: string | null;
  libraryStatus?: string | null;
  pipelineSteps: PipelineStepDerived[];
  /** Teacher-owned video: show CTA to hand off to master admin after segments exist. */
  submitForGoldStandard?: boolean;
}

export function VideoLabelerWrapper({
  videoId,
  videoUrl,
  title,
  initialInstructions,
  motionDna = null,
  suggestedLabels = [],
  patterns,
  isAuthenticated = false,
  bpm = null,
  genre = null,
  libraryStatus = null,
  pipelineSteps,
  submitForGoldStandard = false,
}: VideoLabelerWrapperProps) {
  const router = useRouter();
  const [mockProposals, setMockProposals] = useState<SalsaAgentMetadata[]>([]);
  const [submittingGold, setSubmittingGold] = useState(false);

  const handleSave = useCallback(
    async (
      instructions: DanceInstructions
    ): Promise<{ ok: boolean; error?: string }> => {
      const supabase = createClient();
      const { error } = await supabase
        .from("dance_library")
        .update({ instructions })
        .eq("id", videoId);
      if (error) {
        return { ok: false, error: error.message };
      }
      router.refresh();
      return { ok: true };
    },
    [videoId, router]
  );

  const handleRunAutoLabel = useCallback(async () => {
    const result = await runAutoLabel(videoId);
    if (result.ok) router.refresh();
    return result;
  }, [videoId, router]);

  const handleApproveSuggestion = useCallback(
    async (s: SuggestedLabel) => {
      const result = await approveSuggestedLabel(
        videoId,
        s.move_id,
        s.startTime,
        s.endTime
      );
      if (result.ok) router.refresh();
      return result;
    },
    [videoId, router]
  );

  const handleRejectSuggestion = useCallback(
    async (s: SuggestedLabel) => {
      const result = await rejectSuggestedLabel(
        videoId,
        s.move_id,
        s.startTime,
        s.endTime
      );
      if (result.ok) router.refresh();
      return result;
    },
    [videoId, router]
  );

  const handleApproveForStack = useCallback(
    async (vid: string, s: SuggestedLabel) =>
      approveSuggestedLabel(vid, s.move_id, s.startTime, s.endTime),
    []
  );
  const handleRejectForStack = useCallback(
    async (vid: string, s: SuggestedLabel) =>
      rejectSuggestedLabel(vid, s.move_id, s.startTime, s.endTime),
    []
  );

  const summary = pipelineProgressSummary(pipelineSteps, libraryStatus);
  const showRetry =
    (libraryStatus === "pending_analysis" || libraryStatus === "processing") &&
    !(motionDna?.frames && motionDna.frames.length > 0);
  const publishStep = pipelineSteps.find((s) => s.id === "publish");
  const isPendingGold = libraryStatus === "pending_admin_approval";
  const showReviewCta = publishStep?.visual === "current" && !isPendingGold;

  const handleSubmitGold = useCallback(async () => {
    setSubmittingGold(true);
    const result = await submitTeacherVideoForApproval(videoId);
    setSubmittingGold(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Submitted for master admin approval.");
    router.refresh();
  }, [videoId, router]);

  return (
    <div className="space-y-6">
      {isPendingGold && (
        <div className="rounded-2xl border border-[#FDA4AF]/35 bg-[#FDA4AF]/10 px-4 py-3 text-sm text-foreground">
          <strong>Gold-standard queue.</strong> A master admin will verify
          labels and publish when ready. You can still view this page, but
          editing may be limited until review completes.
        </div>
      )}
      <section className="space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <AdminVideoPipelineSteps steps={pipelineSteps} variant="full" />
        <p className="text-sm text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap items-center gap-3">
          {showRetry && <RetryExtractionButton videoId={videoId} />}
          {submitForGoldStandard && !isPendingGold && (
            <Button
              type="button"
              variant="secondary"
              className="min-h-[40px] border-[#FDA4AF]/40 bg-[#FDA4AF]/10 text-foreground hover:bg-[#FDA4AF]/20"
              disabled={submittingGold || !isAuthenticated}
              onClick={() => void handleSubmitGold()}
            >
              {submittingGold ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit for master admin approval"
              )}
            </Button>
          )}
          {showReviewCta && (
            <Link
              href={`/admin/review/${videoId}`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open Review / Publish →
            </Link>
          )}
        </div>
      </section>

      {/* MAL: mock SalsaAgent proposals for testing Tinder without live Python service */}
      <section className="rounded-2xl border border-dashed border-[rgba(253,164,175,0.4)] bg-white/40 p-4 dark:bg-white/5">
        <h3 className="mb-3 font-serif text-lg font-semibold text-foreground">
          MAL (SalsaAgent)
        </h3>
        {mockProposals.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Load 3–5 mock move suggestions to test swipe and promotion to
            registry (requires motion_dna for promote).
          </p>
        ) : null}
        {mockProposals.length > 0 ? (
          <LabelVerificationStackMAL
            videoId={videoId}
            videoUrl={videoUrl}
            bpm={bpm}
            genre={genre}
            proposals={mockProposals}
            onEmpty={() => setMockProposals([])}
            disabled={!isAuthenticated}
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              setMockProposals(generateMockSalsaAgentProposals(videoId))
            }
            className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Load mock SalsaAgent proposals (testing)
          </button>
        )}
      </section>
      {suggestedLabels.length > 0 && (
        <section className="rounded-2xl border border-[rgba(253,164,175,0.3)] bg-white/60 p-4 shadow-lg backdrop-blur-md dark:bg-white/10">
          <h3 className="mb-3 font-serif text-lg font-semibold text-foreground">
            Verify AI suggestions (Tinder)
          </h3>
          <LabelVerificationStack
            videoId={videoId}
            videoUrl={videoUrl}
            bpm={bpm}
            genre={genre}
            suggestedLabels={suggestedLabels}
            onApprove={handleApproveForStack}
            onReject={handleRejectForStack}
            onEmpty={() => router.refresh()}
            disabled={!isAuthenticated}
          />
        </section>
      )}
      {!isAuthenticated && (
        <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Sign in required to save.</strong> You can segment and label,
          but &quot;Save instructions&quot; will fail until you{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>
          .
        </div>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      <VideoLabeler
        videoUrl={videoUrl}
        videoId={videoId}
        instructions={initialInstructions}
        onSave={handleSave}
        motionDna={motionDna}
        beatTimestamps={motionDna?.metadata?.beat_timestamps ?? undefined}
        suggestedLabels={suggestedLabels}
        onRunAutoLabel={handleRunAutoLabel}
        onApproveSuggestion={handleApproveSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
        patterns={patterns}
      />
    </div>
  );
}

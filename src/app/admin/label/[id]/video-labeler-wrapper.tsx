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
import {
  runAutoLabel,
  approveSuggestedLabel,
  rejectSuggestedLabel,
} from "@/features/admin/actions/label-actions";

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
}: VideoLabelerWrapperProps) {
  const router = useRouter();
  const [mockProposals, setMockProposals] = useState<SalsaAgentMetadata[]>([]);

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

  return (
    <div className="space-y-6">
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

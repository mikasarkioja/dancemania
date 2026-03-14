"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  DanceInstructions,
  MotionDNA,
  SuggestedLabel,
} from "@/types/dance";
import { VideoLabeler } from "@/features/admin";
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
}: VideoLabelerWrapperProps) {
  const router = useRouter();

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

  return (
    <div className="space-y-4">
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

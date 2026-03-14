"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DanceInstructions, MotionDNA, SuggestedLabel } from "@/types/dance";
import { VideoLabeler } from "@/features/admin";
import { runAutoLabel, approveSuggestedLabel, rejectSuggestedLabel } from "@/features/admin/actions/label-actions";

export interface VideoLabelerWrapperProps {
  videoId: string;
  videoUrl: string;
  title: string;
  initialInstructions: DanceInstructions;
  motionDna?: MotionDNA | null;
  suggestedLabels?: SuggestedLabel[];
}

export function VideoLabelerWrapper({
  videoId,
  videoUrl,
  title,
  initialInstructions,
  motionDna = null,
  suggestedLabels = [],
}: VideoLabelerWrapperProps) {
  const router = useRouter();

  const handleSave = useCallback(
    async (instructions: DanceInstructions) => {
      const supabase = createClient();
      await supabase
        .from("dance_library")
        .update({ instructions })
        .eq("id", videoId);
    },
    [videoId]
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
      />
    </div>
  );
}

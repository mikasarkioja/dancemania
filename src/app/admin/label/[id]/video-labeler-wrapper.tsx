"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DanceInstructions, MotionDNA } from "@/types/dance";
import { VideoLabeler } from "@/features/admin";

export interface VideoLabelerWrapperProps {
  videoId: string;
  videoUrl: string;
  title: string;
  initialInstructions: DanceInstructions;
  motionDna?: MotionDNA | null;
}

export function VideoLabelerWrapper({
  videoId,
  videoUrl,
  title,
  initialInstructions,
  motionDna = null,
}: VideoLabelerWrapperProps) {
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
      />
    </div>
  );
}

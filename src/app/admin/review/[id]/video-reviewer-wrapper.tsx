"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DanceInstructions, MotionDNA } from "@/types/dance";
import { VideoReviewer } from "@/features/admin";

export interface VideoReviewerWrapperProps {
  videoId: string;
  videoUrl: string;
  title: string;
  motionDna: MotionDNA | null;
  instructions: DanceInstructions;
  status: string | null;
}

export function VideoReviewerWrapper({
  videoId,
  videoUrl,
  title,
  motionDna,
  instructions,
  status,
}: VideoReviewerWrapperProps) {
  const router = useRouter();
  const supabase = createClient();

  const onApprove = useCallback(async () => {
    await supabase
      .from("dance_library")
      .update({
        status: "published",
        verified_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", videoId);
    router.refresh();
  }, [videoId, router, supabase]);

  const onReject = useCallback(
    async (reason: string) => {
      await supabase
        .from("dance_library")
        .update({
          status: "needs_relabeling",
          rejection_reason: reason || null,
          verified_at: null,
        })
        .eq("id", videoId);
      router.refresh();
    },
    [videoId, router, supabase]
  );

  const onSwapIds = useCallback(
    async (swappedMotionDna: MotionDNA) => {
      await supabase
        .from("dance_library")
        .update({ motion_dna: swappedMotionDna })
        .eq("id", videoId);
      router.refresh();
    },
    [videoId, router, supabase]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <VideoReviewer
        videoUrl={videoUrl}
        videoId={videoId}
        motionDna={motionDna}
        instructions={instructions}
        status={status}
        onApprove={onApprove}
        onReject={onReject}
        onSwapIds={onSwapIds}
      />
    </div>
  );
}

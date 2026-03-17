"use client";

/**
 * Stack of LabelVerificationCards for MAL: one card at a time, approve/reject
 * dismisses and shows next. Uses suggested_labels normalized to AI_PROPOSAL.
 */

import { useCallback, useMemo, useState } from "react";
import { LabelVerificationCard } from "./LabelVerificationCard";
import {
  suggestedLabelToProposal,
  type AI_PROPOSAL,
} from "./AdminVerificationTinder";
import type { SuggestedLabel } from "@/types/dance";

export interface LabelVerificationStackProps {
  videoId: string;
  videoUrl: string;
  bpm?: number | null;
  genre?: string | null;
  suggestedLabels: SuggestedLabel[];
  onApprove: (
    videoId: string,
    s: SuggestedLabel
  ) => Promise<{ ok: boolean; error?: string }>;
  onReject: (
    videoId: string,
    s: SuggestedLabel
  ) => Promise<{ ok: boolean; error?: string }>;
  onEmpty?: () => void;
  disabled?: boolean;
}

function suggestionToProposal(s: SuggestedLabel, i: number): AI_PROPOSAL {
  return suggestedLabelToProposal(s, i);
}

export function LabelVerificationStack({
  videoId,
  videoUrl,
  bpm,
  genre,
  suggestedLabels,
  onApprove,
  onReject,
  onEmpty,
  disabled = false,
}: LabelVerificationStackProps) {
  const proposals = useMemo(
    () => suggestedLabels.map((s, i) => suggestionToProposal(s, i)),
    [suggestedLabels]
  );
  const [index, setIndex] = useState(0);
  const current = proposals[index] ?? null;

  const handleApprove = useCallback(
    async (p: AI_PROPOSAL) => {
      const s = suggestedLabels.find(
        (x) =>
          x.move_id === p.move_id &&
          x.startTime === p.startTime &&
          x.endTime === p.endTime
      );
      if (!s) return { ok: false, error: "Suggestion not found" };
      return onApprove(videoId, s);
    },
    [suggestedLabels, videoId, onApprove]
  );

  const handleReject = useCallback(
    async (p: AI_PROPOSAL) => {
      const s = suggestedLabels.find(
        (x) =>
          x.move_id === p.move_id &&
          x.startTime === p.startTime &&
          x.endTime === p.endTime
      );
      if (!s) return { ok: false, error: "Suggestion not found" };
      return onReject(videoId, s);
    },
    [suggestedLabels, videoId, onReject]
  );

  const handleDismiss = useCallback(() => {
    if (index < proposals.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onEmpty?.();
    }
  }, [index, proposals.length, onEmpty]);

  if (proposals.length === 0) {
    return null;
  }

  if (!current) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Verify suggestion {index + 1} of {proposals.length} — swipe or use
        buttons
      </p>
      <LabelVerificationCard
        proposal={current}
        videoId={videoId}
        videoUrl={videoUrl}
        bpm={bpm}
        genre={genre}
        onApprove={handleApprove}
        onReject={handleReject}
        onDismiss={handleDismiss}
        disabled={disabled}
      />
    </div>
  );
}

"use client";

/**
 * MAL stack: SalsaAgentMetadata[] → one card at a time. Approve calls
 * promoteProposalToRegistry; reject updates local state (or persists to ai_proposals).
 */

import { useCallback, useMemo, useState } from "react";
import { LabelVerificationCard } from "./LabelVerificationCard";
import type { AI_PROPOSAL } from "./AdminVerificationTinder";
import { salsaAgentMetadataToTinderShape } from "@/types/mal";
import { promoteProposalToRegistry } from "@/features/admin/actions/mal-actions";
import type { SalsaAgentMetadata } from "@/types/mal";

export interface LabelVerificationStackMALProps {
  videoId: string;
  videoUrl: string;
  bpm?: number | null;
  genre?: string | null;
  /** Pending SalsaAgent proposals (from ai_proposals or mock). */
  proposals: SalsaAgentMetadata[];
  onPromoted?: (moveId: string) => void;
  onRejected?: (proposalId: string) => void;
  onEmpty?: () => void;
  disabled?: boolean;
}

export function LabelVerificationStackMAL({
  videoId,
  videoUrl,
  bpm,
  genre,
  proposals: initialProposals,
  onPromoted,
  onRejected,
  onEmpty,
  disabled = false,
}: LabelVerificationStackMALProps) {
  const [proposals, setProposals] = useState<SalsaAgentMetadata[]>(() =>
    initialProposals.filter((p) => p.status === "pending")
  );
  const [index, setIndex] = useState(0);
  const current = proposals[index] ?? null;
  const tinderShape: AI_PROPOSAL | null = useMemo(
    () => (current ? salsaAgentMetadataToTinderShape(current) : null),
    [current]
  );

  const handleApprove = useCallback(
    async (_proposal: AI_PROPOSAL) => {
      if (!current) return { ok: false, error: "No proposal" };
      const result = await promoteProposalToRegistry(videoId, current);
      if (result.success) {
        onPromoted?.(result.moveId);
        setProposals((prev) => {
          const next = prev.filter(
            (x) => x.proposal_id !== current.proposal_id
          );
          if (next.length === 0) onEmpty?.();
          return next;
        });
        setIndex(0);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [current, videoId, onPromoted, onEmpty]
  );

  const handleReject = useCallback(
    async (_proposal: AI_PROPOSAL) => {
      if (!current) return { ok: false, error: "No proposal" };
      onRejected?.(current.proposal_id);
      setProposals((prev) => {
        const next = prev.filter((x) => x.proposal_id !== current.proposal_id);
        if (next.length === 0) onEmpty?.();
        return next;
      });
      setIndex(0);
      return { ok: true };
    },
    [current, onRejected, onEmpty]
  );

  const handleDismiss = useCallback(() => {
    if (index < proposals.length - 1) setIndex((i) => i + 1);
    else onEmpty?.();
  }, [index, proposals.length, onEmpty]);

  if (proposals.length === 0 || !tinderShape) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        MAL: {index + 1} of {proposals.length} — swipe or use buttons
      </p>
      <LabelVerificationCard
        proposal={tinderShape}
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

"use client";

/**
 * Admin Verification UI — "Tinder for Labels" boilerplate.
 * Handles AI_PROPOSAL objects: one-click (and optional swipe) Approve/Reject.
 * Use with suggested_labels (Scanner) and/or Magic Wand suggestions normalized to AI_PROPOSAL[].
 */

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ChevronRight, ChevronLeft } from "lucide-react";
import type { SuggestedLabel } from "@/types/dance";
import type { SuggestedSegment } from "@/engines/segmentation";

/** Unified AI suggestion for Admin Verification (Scanner, Magic Wand, or SalsaAgent MAL). */
export interface AI_PROPOSAL {
  id: string;
  source: "scanner" | "magic_wand" | "SalsaAgent_v1";
  startTime: number;
  endTime: number;
  label: string;
  /** 0–1; from similarity (scanner) or confidence (magic_wand / SalsaAgent). */
  confidence: number;
  /** Scanner only: move_id for approve/reject. */
  move_id?: string;
  /** Scanner only: move_name. */
  move_name?: string;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Normalize SuggestedLabel (Scanner) to AI_PROPOSAL. */
export function suggestedLabelToProposal(
  s: SuggestedLabel,
  index: number
): AI_PROPOSAL {
  return {
    id: `scanner-${s.move_id}-${s.startTime}-${s.endTime}-${index}`,
    source: "scanner",
    startTime: s.startTime,
    endTime: s.endTime,
    label: s.move_name ?? "Unknown",
    confidence: s.similarity ?? 0,
    move_id: s.move_id,
    move_name: s.move_name,
  };
}

/** Normalize SuggestedSegment (Magic Wand) to AI_PROPOSAL. */
export function suggestedSegmentToProposal(
  s: SuggestedSegment,
  index: number
): AI_PROPOSAL {
  return {
    id: `magic_wand-${s.start}-${s.end}-${index}`,
    source: "magic_wand",
    startTime: s.start,
    endTime: s.end,
    label: s.label.replace(/^Suggested:\s*/i, ""),
    confidence: s.confidence,
  };
}

export interface AdminVerificationTinderProps {
  proposals: AI_PROPOSAL[];
  onApprove: (p: AI_PROPOSAL) => Promise<{ ok: boolean; error?: string }>;
  onReject: (p: AI_PROPOSAL) => Promise<{ ok: boolean; error?: string }>;
  /** Optional: Magic Wand confirm (no move_id); if not provided, only scanner proposals get Approve. */
  onConfirmMagicWand?: (p: AI_PROPOSAL) => void | Promise<void>;
  disabled?: boolean;
  /** Show confidence tier badge when >= this (e.g. 0.85). */
  highConfidenceThreshold?: number;
}

export function AdminVerificationTinder({
  proposals,
  onApprove,
  onReject,
  onConfirmMagicWand,
  disabled = false,
  highConfidenceThreshold = 0.85,
}: AdminVerificationTinderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = proposals[currentIndex] ?? null;
  const hasNext = currentIndex < proposals.length - 1;
  const hasPrev = currentIndex > 0;

  const handleApprove = useCallback(async () => {
    if (!current) return;
    setError(null);
    setLoading("approve");
    try {
      if (current.source === "magic_wand" && onConfirmMagicWand) {
        await onConfirmMagicWand(current);
      } else {
        const result = await onApprove(current);
        if (!result.ok) setError(result.error ?? "Approve failed");
      }
      if (hasNext) setCurrentIndex((i) => i + 1);
    } finally {
      setLoading(null);
    }
  }, [current, onApprove, onConfirmMagicWand, hasNext]);

  const handleReject = useCallback(async () => {
    if (!current) return;
    setError(null);
    setLoading("reject");
    try {
      const result = await onReject(current);
      if (!result.ok) setError(result.error ?? "Reject failed");
      if (hasNext) setCurrentIndex((i) => i + 1);
    } finally {
      setLoading(null);
    }
  }, [current, onReject, hasNext]);

  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No AI suggestions to verify. Run &quot;Run auto label&quot; or
          &quot;Magic Wand&quot; first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Verify AI suggestions</CardTitle>
        <p className="text-xs text-muted-foreground">
          {currentIndex + 1} of {proposals.length} — Approve (✓) or Reject (✗)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {current && (
          <div
            className="rounded-xl border bg-card p-4"
            role="article"
            aria-label={`Suggestion: ${current.label} from ${current.startTime}s to ${current.endTime}s`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{current.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatTime(current.startTime)} – {formatTime(current.endTime)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  current.confidence >= highConfidenceThreshold
                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {(current.confidence * 100).toFixed(0)}%
                {current.confidence >= highConfidenceThreshold
                  ? " high confidence"
                  : ""}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {current.source.replace("_", " ")}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={disabled || !hasPrev}
            aria-label="Previous suggestion"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={disabled || loading != null}
              aria-label="Reject"
            >
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApprove}
              disabled={disabled || loading != null}
              aria-label="Approve"
            >
              <Check className="mr-1 h-4 w-4" />
              Approve
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentIndex((i) => Math.min(proposals.length - 1, i + 1))
            }
            disabled={disabled || !hasNext}
            aria-label="Next suggestion"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {loading && (
          <p className="text-center text-xs text-muted-foreground">
            {loading === "approve" ? "Approving…" : "Rejecting…"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

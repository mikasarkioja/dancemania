"use client";

/**
 * Tinder-style MAL verification card: segment video, AI label, confidence,
 * swipe (Approve/Reject) and thumb-zone buttons. Boutique aesthetic.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { AI_PROPOSAL } from "./AdminVerificationTinder";

const SWIPE_THRESHOLD = 120;
const CARD_EXIT_X = 400;
const ROSE_GOLD_BORDER = "rgba(253, 164, 175, 0.5)";

export interface LabelVerificationCardProps {
  proposal: AI_PROPOSAL;
  videoId: string;
  videoUrl: string;
  bpm?: number | null;
  genre?: string | null;
  onApprove: (p: AI_PROPOSAL) => Promise<{ ok: boolean; error?: string }>;
  onReject: (p: AI_PROPOSAL) => Promise<{ ok: boolean; error?: string }>;
  onDismiss?: () => void;
  disabled?: boolean;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function LabelVerificationCard({
  proposal,
  videoUrl,
  bpm,
  genre,
  onApprove,
  onReject,
  onDismiss,
  disabled = false,
}: LabelVerificationCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [12, -12]);
  const approveOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  // Loop video segment [startTime, endTime]
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const start = proposal.startTime;
    const end = proposal.endTime;
    const loopSegment = () => {
      if (v.currentTime >= end - 0.1) v.currentTime = start;
    };
    const onLoaded = () => {
      v.currentTime = start;
      v.play().catch(() => {});
    };
    v.addEventListener("timeupdate", loopSegment);
    v.addEventListener("loadedmetadata", onLoaded);
    if (v.readyState >= 1) onLoaded();
    return () => {
      v.removeEventListener("timeupdate", loopSegment);
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [videoUrl, proposal.startTime, proposal.endTime]);

  const handleApprove = useCallback(async () => {
    setError(null);
    setLoading("approve");
    try {
      const result = await onApprove(proposal);
      if (!result.ok) setError(result.error ?? "Approve failed");
      else onDismiss?.();
    } finally {
      setLoading(null);
    }
  }, [proposal, onApprove, onDismiss]);

  const handleReject = useCallback(async () => {
    setRejectModalOpen(false);
    setError(null);
    setLoading("reject");
    try {
      const result = await onReject(proposal);
      if (!result.ok) setError(result.error ?? "Reject failed");
      else onDismiss?.();
    } finally {
      setLoading(null);
    }
  }, [proposal, onReject, onDismiss]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || loading) return;
      const offsetX = info.offset.x;
      const velocityX = info.velocity.x;
      if (offsetX > SWIPE_THRESHOLD || velocityX > 300) {
        animate(x, CARD_EXIT_X, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        }).then(() => {
          handleApprove();
        });
      } else if (offsetX < -SWIPE_THRESHOLD || velocityX < -300) {
        setRejectModalOpen(true);
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      } else {
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    },
    [disabled, loading, x, handleApprove]
  );

  return (
    <>
      <motion.div
        className="relative touch-none select-none"
        style={{ x, rotate, willChange: "transform" }}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
      >
        {/* Swipe-right hint (check) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-end rounded-2xl border-2 border-green-500/40 bg-green-500/10 pr-6 pointer-events-none"
          style={{ opacity: approveOpacity, zIndex: 0 }}
        >
          <Check className="h-14 w-14 text-green-600" />
        </motion.div>
        {/* Swipe-left hint (X) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-start rounded-2xl border-2 border-destructive/40 bg-destructive/10 pl-6 pointer-events-none"
          style={{ opacity: rejectOpacity, zIndex: 0 }}
        >
          <X className="h-14 w-14 text-destructive" />
        </motion.div>

        <div
          className="relative z-10 overflow-hidden rounded-2xl border-2 bg-white/85 shadow-xl backdrop-blur-xl dark:bg-white/10"
          style={{
            borderColor: ROSE_GOLD_BORDER,
            boxShadow: `0 8px 32px rgba(253, 164, 175, 0.15), inset 0 1px 0 rgba(255,255,255,0.6)`,
          }}
        >
          {/* Segment video */}
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="h-full w-full object-contain"
              playsInline
              muted
              loop
              preload="metadata"
            />
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {formatTime(proposal.startTime)} – {formatTime(proposal.endTime)}
            </div>
          </div>

          {/* Label + confidence + metadata */}
          <div className="p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {proposal.label}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  proposal.confidence >= 0.85
                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                }`}
              >
                Accuracy: {(proposal.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {bpm != null && <span>{bpm} BPM</span>}
              {genre && <span className="capitalize">{genre}</span>}
            </div>
          </div>

          {/* Thumb-zone: Approve / Reject */}
          <div className="flex gap-3 p-4 pt-0 pb-safe">
            <Button
              type="button"
              variant="destructive"
              className="min-h-[48px] min-w-[48px] flex-1 touch-manipulation tap-scale rounded-xl"
              onClick={() => setRejectModalOpen(true)}
              disabled={disabled || loading != null}
              aria-label="Reject"
            >
              <X className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="default"
              className="min-h-[48px] min-w-[48px] flex-1 touch-manipulation tap-scale rounded-xl bg-primary text-primary-foreground"
              onClick={handleApprove}
              disabled={disabled || loading != null}
              aria-label="Approve"
            >
              <Check className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {loading === "approve" ? "Approving…" : "Rejecting…"}
        </p>
      )}

      {/* Reject / Edit modal */}
      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pt-safe pb-safe bg-black/40 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
          aria-labelledby="reject-modal-title"
          onClick={() => setRejectModalOpen(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-white/10"
            style={{
              borderColor: ROSE_GOLD_BORDER,
              boxShadow: `0 8px 32px rgba(253, 164, 175, 0.2)`,
            }}
          >
            <div className="p-6">
              <h2
                id="reject-modal-title"
                className="font-serif text-lg font-semibold text-foreground"
              >
                Edit or discard
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Discard this AI suggestion, or cancel to keep it.
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] flex-1 touch-manipulation tap-scale"
                  onClick={() => setRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-[44px] flex-1 touch-manipulation tap-scale"
                  onClick={handleReject}
                  disabled={loading != null}
                >
                  Discard
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

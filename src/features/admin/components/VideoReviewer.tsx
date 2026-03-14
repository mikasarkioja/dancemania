"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DanceInstructions, MotionDNA, MoveSegment } from "@/types/dance";
import { drawSkeleton } from "@/lib/utils/skeleton-canvas";
import {
  getFramesAtTime,
  swapPartnerIds,
} from "@/lib/utils/motion-frame-at-time";
import { MoveLooper } from "@/components/MoveLooper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const FPS = 30;
const LEADER_COLOR = "#3b82f6"; // blue
const FOLLOWER_COLOR = "#ec4899"; // pink

export interface VideoReviewerProps {
  videoUrl: string;
  videoId: string;
  motionDna: MotionDNA | null;
  instructions: DanceInstructions;
  status?: string | null;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onSwapIds?: (swappedMotionDna: MotionDNA) => Promise<void>;
  disabled?: boolean;
}

export function VideoReviewer({
  videoUrl,
  videoId,
  motionDna: initialMotionDna,
  instructions,
  status,
  onApprove,
  onReject,
  onSwapIds,
  disabled = false,
}: VideoReviewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [motionDna, setMotionDna] = useState<MotionDNA | null>(
    initialMotionDna ?? null
  );
  const [checkTrackStable, setCheckTrackStable] = useState(false);
  const [checkBeatAligned, setCheckBeatAligned] = useState(false);
  const [checkLabelsAccurate, setCheckLabelsAccurate] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<MoveSegment | null>(
    null
  );
  const [looping, setLooping] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);

  const displayDna = motionDna;

  useEffect(() => {
    setMotionDna(initialMotionDna ?? null);
  }, [initialMotionDna]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoadedMetadata = () => setDuration(v.duration);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    if (v.duration && !Number.isNaN(v.duration)) setDuration(v.duration);
    return () => v.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [videoUrl]);

  // Resize canvas to match video display size
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const updateSize = () => {
      const rect = video.getBoundingClientRect();
      if (rect.width && rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [videoUrl]);

  // Draw skeletons synced to video.currentTime
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !displayDna) return;

    let rafId: number;
    const draw = () => {
      const currentTime = video.currentTime;
      const { leader, follower } = getFramesAtTime(
        displayDna,
        currentTime,
        FPS
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (leader?.joints) drawSkeleton(ctx, leader.joints, w, h, LEADER_COLOR);
      if (follower?.joints)
        drawSkeleton(ctx, follower.joints, w, h, FOLLOWER_COLOR);
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [displayDna]);

  const handleStepFrame = useCallback((direction: -1 | 1) => {
    const v = videoRef.current;
    if (!v) return;
    const step = 1 / FPS;
    let t = v.currentTime + direction * step;
    t = Math.max(0, Math.min(t, v.duration || 0));
    v.currentTime = t;
    v.pause();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (v.paused) v.play();
        else v.pause();
      }
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        handleStepFrame(-1);
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        handleStepFrame(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleStepFrame]);

  const handleSwapIds = useCallback(async () => {
    if (!motionDna) return;
    const next = swapPartnerIds(motionDna);
    await onSwapIds?.(next);
    setMotionDna(next);
  }, [motionDna, onSwapIds]);

  const handleApprove = useCallback(async () => {
    if (!onApprove) return;
    setApproving(true);
    try {
      await onApprove();
    } finally {
      setApproving(false);
    }
  }, [onApprove]);

  const handleReject = useCallback(async () => {
    if (!onReject) return;
    setRejecting(true);
    try {
      await onReject(rejectionReason);
    } finally {
      setRejecting(false);
    }
  }, [onReject, rejectionReason]);

  const isPublished = status === "published";
  const isNeedsRelabeling = status === "needs_relabeling";

  return (
    <div className="flex flex-col gap-6 lg:flex-row" data-video-id={videoId}>
      {/* Main: video + canvas overlay */}
      <div className="min-w-0 flex-1 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Video & skeleton</CardTitle>
            <p className="text-xs text-muted-foreground">
              Space: play/pause · J: previous frame · L: next frame
            </p>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className="relative aspect-video w-full overflow-hidden rounded-md border bg-black"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
              {displayDna?.frames?.length ? (
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute left-0 top-0 h-full w-full object-contain"
                  style={{ width: "100%", height: "100%" }}
                  aria-hidden
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-white drop-shadow-md">
                    No skeleton data
                  </p>
                  <p className="max-w-md text-xs text-white/90 drop-shadow">
                    This video has no <code className="rounded bg-white/20 px-1">motion_dna</code>. Run pose extraction to see the skeleton overlay and for this video to appear in Dictionary Lab.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline: instruction markers + segment loop */}
        {duration > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Click a segment to loop it for review
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative h-8 w-full overflow-hidden rounded bg-secondary">
                {instructions.map((seg, i) => (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      "absolute top-1 h-6 rounded border px-2 text-xs font-medium transition-colors",
                      selectedSegment === seg
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/50 bg-primary/40 hover:bg-primary/60"
                    )}
                    style={{
                      left: `${(seg.startTime / duration) * 100}%`,
                      width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
                      minWidth: "60px",
                    }}
                    onClick={() => {
                      setSelectedSegment(seg);
                      setLooping(true);
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.startTime;
                        videoRef.current.play();
                      }
                    }}
                  >
                    {seg.pattern}
                  </button>
                ))}
              </div>
              {selectedSegment && (
                <MoveLooper
                  videoRef={videoRef}
                  selectedMove={{
                    startTime: selectedSegment.startTime,
                    endTime: selectedSegment.endTime,
                  }}
                  looping={looping}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar: QC checklist + actions */}
      <aside className="w-full shrink-0 space-y-4 lg:w-72">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={checkTrackStable}
                onChange={(e) => setCheckTrackStable(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">Track IDs stable (No swaps)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={checkBeatAligned}
                onChange={(e) => setCheckBeatAligned(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                Beat &apos;1&apos; aligned with music
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={checkLabelsAccurate}
                onChange={(e) => setCheckLabelsAccurate(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                Move labels (Instructions) are accurate
              </span>
            </label>
            {motionDna?.frames?.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSwapIds}
                disabled={disabled}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Swap IDs
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isPublished && !isNeedsRelabeling && (
              <>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleApprove}
                  disabled={disabled || approving}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve &amp; Publish
                </Button>
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">
                    Reason (if rejecting)
                  </Label>
                  <Input
                    id="rejection-reason"
                    placeholder="e.g. Labels need correction"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={handleReject}
                    disabled={disabled || rejecting}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject (needs relabeling)
                  </Button>
                </div>
              </>
            )}
            {isPublished && <p className="text-sm text-green-600">Published</p>}
            {isNeedsRelabeling && (
              <p className="text-sm text-amber-600">Needs relabeling</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

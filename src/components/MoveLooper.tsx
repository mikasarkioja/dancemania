"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SelectedMove {
  startTime: number;
  endTime: number;
}

const PRACTICE_PAUSE_MS = 1500;
const SPEED_OPTIONS = [0.5, 0.75, 1] as const;
const END_TOLERANCE = 0.05;

export interface MoveLooperProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  selectedMove: SelectedMove | null;
  /** When true, loop is active (seek back at end). When false, video plays normally. */
  looping?: boolean;
  className?: string;
}

/**
 * Loops a video segment [startTime, endTime] with high-precision timing via
 * requestAnimationFrame. Optional practice-mode pause and playback speed.
 */
export function MoveLooper({
  videoRef,
  selectedMove,
  looping = true,
  className,
}: MoveLooperProps) {
  const [practiceMode, setPracticeMode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedForPracticeRef = useRef(false);

  // Apply playback rate whenever it or the video ref changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // High-precision loop: requestAnimationFrame checks time and seeks at end
  useEffect(() => {
    if (!selectedMove || !looping) return;

    const video = videoRef.current;
    if (!video) return;

    let rafId: number;

    const tick = () => {
      if (isPausedForPracticeRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const current = video.currentTime;
      const { startTime, endTime } = selectedMove;

      if (current >= endTime - END_TOLERANCE) {
        if (practiceMode) {
          isPausedForPracticeRef.current = true;
          video.pause();
          pauseTimeoutRef.current = setTimeout(() => {
            video.currentTime = startTime;
            video.playbackRate = playbackRate;
            video.play();
            isPausedForPracticeRef.current = false;
            pauseTimeoutRef.current = null;
          }, PRACTICE_PAUSE_MS);
        } else {
          video.currentTime = startTime;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      isPausedForPracticeRef.current = false;
    };
  }, [selectedMove, looping, practiceMode, playbackRate, videoRef]);

  if (!selectedMove) return null;

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="practice-mode"
          checked={practiceMode}
          onChange={(e) => setPracticeMode(e.target.checked)}
          className="rounded border-input"
        />
        <Label htmlFor="practice-mode" className="cursor-pointer text-sm">
          Practice mode (1.5s pause at end of loop)
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Speed</span>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={playbackRate === rate ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeedChange(rate)}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

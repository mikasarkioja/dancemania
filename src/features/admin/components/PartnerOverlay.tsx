"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeedPoint, TrackingSeeds } from "@/types/dance";
import { toNormalized } from "@/lib/utils/geometry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, RotateCcw } from "lucide-react";

const HIP_TIP =
  "For best results, click the center of the hips to lock the dancer ID.";

export interface PartnerOverlayProps {
  /** Initial seeds (e.g. from parent state). */
  seeds: TrackingSeeds | null;
  /** Called when both leader and follower hip seeds are set. */
  onSeedsChange: (seeds: TrackingSeeds) => void;
  /** Called when Reset Seeds is clicked. */
  onReset?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps the video preview. Captures two clicks as Leader and Follower hip seeds
 * (mid-hip anchor). Renders L/F badges and a subtle hip-aim guide. Normalized
 * values are saved to Supabase tracking_seeds (leader_hip_seed, follower_hip_seed).
 */
export function PartnerOverlay({
  seeds,
  onSeedsChange,
  onReset,
  disabled = false,
  children,
}: PartnerOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leader, setLeader] = useState<SeedPoint | null>(
    seeds?.leader_hip_seed ?? null
  );
  const [follower, setFollower] = useState<SeedPoint | null>(
    seeds?.follower_hip_seed ?? null
  );

  useEffect(() => {
    setLeader(seeds?.leader_hip_seed ?? null);
    setFollower(seeds?.follower_hip_seed ?? null);
  }, [seeds]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const point = toNormalized(e.clientX, e.clientY, rect);

      if (leader === null) {
        setLeader(point);
      } else if (follower === null) {
        setFollower(point);
        onSeedsChange({
          leader_hip_seed: leader,
          follower_hip_seed: point,
        });
      }
    },
    [disabled, leader, follower, onSeedsChange]
  );

  const handleReset = useCallback(() => {
    setLeader(null);
    setFollower(null);
    onReset?.();
  }, [onReset]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative w-full" ref={containerRef}>
        {children}

        {/* Subtle hip-aim guide: dashed circle + crosshair suggesting center of waist/hips */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <svg
            className="h-16 w-16 opacity-40"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          >
            <circle cx="32" cy="32" r="24" />
            <line x1="32" y1="8" x2="32" y2="56" />
            <line x1="8" y1="32" x2="56" y2="32" />
          </svg>
        </div>

        {/* Transparent overlay to capture clicks */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleOverlayClick}
          onKeyDown={(e) => e.key === "Escape" && handleReset()}
          role="button"
          tabIndex={0}
          aria-label="Click to set Leader hip seed, then Follower hip seed"
        />

        {/* Leader hip seed badge */}
        {leader && (
          <Badge
            variant="success"
            className="pointer-events-none absolute z-10 size-8 items-center justify-center p-0 text-sm"
            style={{
              left: `${leader.x * 100}%`,
              top: `${leader.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            L
          </Badge>
        )}

        {/* Follower hip seed badge */}
        {follower && (
          <Badge
            variant="partner"
            className="pointer-events-none absolute z-10 size-8 items-center justify-center p-0 text-sm"
            style={{
              left: `${follower.x * 100}%`,
              top: `${follower.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            F
          </Badge>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span className="text-xs">Hip tip</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {HIP_TIP}
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Seeds
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

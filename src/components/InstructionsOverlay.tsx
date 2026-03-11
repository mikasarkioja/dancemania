"use client";

import type { DanceInstructions } from "@/types/dance";

export interface InstructionsOverlayProps {
  /** Move segments from dance_library.instructions */
  instructions: DanceInstructions;
  /** Current playback time in seconds */
  currentTime: number;
  /** Optional class for the overlay container */
  className?: string;
}

/**
 * Renders the current segment's teacher instruction as overlay text/caption
 * when a student plays a teacher video. Use alongside a video element and
 * pass video.currentTime (e.g. from timeupdate).
 */
export function InstructionsOverlay({
  instructions,
  currentTime,
  className = "",
}: InstructionsOverlayProps) {
  const segment = instructions.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  if (!segment) return null;

  return (
    <div
      className={`pointer-events-none absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-center text-sm text-white ${className}`}
      role="caption"
      aria-live="polite"
    >
      <span className="font-medium">{segment.pattern}:</span>{" "}
      {segment.teacherInstruction}
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { logVideoActivity } from "@/features/analytics/actions/video-usage-actions";

/**
 * Calls logVideoActivity(videoId, 'view') once when the underlying video fires "playing".
 */
export function useVideoViewLog(videoId: string | undefined | null) {
  const logged = useRef(false);

  useEffect(() => {
    logged.current = false;
  }, [videoId]);

  return {
    onPlaying: () => {
      if (!videoId || logged.current) return;
      logged.current = true;
      void logVideoActivity(videoId, "view");
    },
  };
}

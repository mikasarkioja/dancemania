"use client";

import { useEffect, useRef, useState } from "react";
import type { DanceInstructions } from "@/types/dance";
import { InstructionsOverlay } from "@/components/InstructionsOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PracticePlayerProps {
  videoId: string;
  title: string;
  videoUrl: string;
  instructions: DanceInstructions;
}

export function PracticePlayer({
  title,
  videoUrl,
  instructions,
}: PracticePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="h-full w-full object-contain"
            playsInline
            preload="metadata"
          />
          <InstructionsOverlay
            instructions={instructions}
            currentTime={currentTime}
            className="rounded-b-md"
          />
        </div>
      </CardContent>
    </Card>
  );
}

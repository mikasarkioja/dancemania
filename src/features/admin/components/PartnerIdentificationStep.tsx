"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackingSeeds } from "@/types/dance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PartnerOverlay } from "./PartnerOverlay";

const MAX_PREVIEW_SIZE = 640;

export interface PartnerIdentificationStepProps {
  videoFile: File;
  seeds: TrackingSeeds | null;
  onSeedsChange: (seeds: TrackingSeeds) => void;
  onReset?: () => void;
  disabled?: boolean;
}

export function PartnerIdentificationStep({
  videoFile,
  seeds,
  onSeedsChange,
  onReset,
  disabled = false,
}: PartnerIdentificationStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameReady, setFrameReady] = useState(false);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !frameReady) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.drawImage(video, 0, 0, w, h);
  }, [frameReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const onLoadedData = () => {
      video.currentTime = 0;
    };

    const onSeeked = () => {
      const canvas = canvasRef.current;
      if (!canvas || !video.videoWidth) return;

      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > MAX_PREVIEW_SIZE || h > MAX_PREVIEW_SIZE) {
        const scale = MAX_PREVIEW_SIZE / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      setFrameReady(true);
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Partner identification</CardTitle>
        <CardDescription>
          Mark the Leader and Follower so we can separate their motion data
          later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label className="text-muted-foreground">
          Click the frame twice: first for Leader (L), then for Follower (F).
        </Label>
        <PartnerOverlay
          seeds={seeds}
          onSeedsChange={onSeedsChange}
          onReset={onReset}
          disabled={disabled}
        >
          <div className="relative inline-block overflow-hidden rounded-md border bg-muted">
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
              preload="metadata"
            />
            <canvas
              ref={canvasRef}
              className="block max-w-full touch-none"
              style={{ height: "auto" }}
              role="img"
              aria-label="First frame: click overlay to set Leader and Follower seeds"
            />
          </div>
        </PartnerOverlay>
      </CardContent>
    </Card>
  );
}

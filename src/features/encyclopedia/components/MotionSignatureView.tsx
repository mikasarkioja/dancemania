"use client";

import { useEffect, useRef } from "react";
import type { BiomechanicalSignature, Joint3D } from "@/types/dance";
import { drawSkeleton } from "@/lib/utils/skeleton-canvas";

export interface MotionSignatureViewProps {
  signature: BiomechanicalSignature | null;
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

function toJoint3D(j: {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}): Joint3D {
  return { x: j.x, y: j.y, z: j.z, visibility: j.visibility ?? 1 };
}

export function MotionSignatureView({
  signature,
  className,
  width = 200,
  height = 200,
  color = "hsl(var(--primary))",
}: MotionSignatureViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !signature?.joints ||
      Object.keys(signature.joints).length === 0
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const joints: Record<string, Joint3D> = {};
    for (const [k, v] of Object.entries(signature.joints))
      joints[k] = toJoint3D(v);
    ctx.clearRect(0, 0, width, height);
    drawSkeleton(ctx, joints, width, height, color);
  }, [signature, width, height, color]);

  if (!signature?.joints || Object.keys(signature.joints).length === 0) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-label="No motion signature"
      >
        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground">
          No pose data
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
      aria-label="Motion signature pose"
    />
  );
}

"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { MotionDNA, PoseFrame } from "@/types/dance";
import { drawSkeleton } from "@/lib/utils/skeleton-canvas";
import { computeMoveSignature } from "@/engines/signature-calculator";
import { saveMoveToRegistry } from "@/features/admin/actions/registry-actions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FPS = 30;
const LEADER_COLOR = "#3b82f6";

export interface DictionaryLabProps {
  videos: {
    id: string;
    title: string;
    video_url: string;
    motion_dna: unknown;
    bpm?: number | null;
    genre?: string | null;
  }[];
}

export function DictionaryLab({ videos }: DictionaryLabProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [moveName, setMoveName] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === selectedVideoId),
    [videos, selectedVideoId]
  );

  const motionDna = selectedVideo?.motion_dna as MotionDNA | null | undefined;
  const frames = useMemo(() => {
    if (!motionDna?.frames?.length) return [];
    return motionDna.frames.filter((f) => f.partner_id === 0) as PoseFrame[];
  }, [motionDna]);

  const signature = useMemo(() => {
    if (!motionDna?.frames?.length) return null;
    return computeMoveSignature(motionDna.frames, 0);
  }, [motionDna]);

  const chartData = useMemo(() => {
    if (!signature) return [];
    const countLength = 8;
    const n = Math.max(
      signature.hipTiltCurve.length,
      signature.footVelocityCurve.length
    );
    return Array.from({ length: n }, (_, i) => {
      const count = n > 1 ? (i / (n - 1)) * countLength : 0;
      return {
        count: Math.round(count * 10) / 10,
        hipTilt: signature.hipTiltCurve[i] ?? 0,
        footVelocity: signature.footVelocityCurve[i] ?? 0,
      };
    });
  }, [signature]);

  useEffect(() => {
    if (!videos.length) return;
    if (!selectedVideoId && videos[0]) setSelectedVideoId(videos[0].id);
  }, [videos, selectedVideoId]);

  useEffect(() => {
    setPlaybackFrameIndex(0);
  }, [selectedVideoId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !motionDna || frames.length === 0) return;
    const frame = frames[playbackFrameIndex] ?? frames[0];
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (frame?.joints) drawSkeleton(ctx, frame.joints, w, h, LEADER_COLOR);
  }, [motionDna, frames, playbackFrameIndex]);

  useEffect(() => {
    if (frames.length <= 1) return;
    const t = setInterval(() => {
      setPlaybackFrameIndex((i) => (i + 1) % frames.length);
    }, 1000 / FPS);
    return () => clearInterval(t);
  }, [frames.length]);

  const durationSec = useMemo(() => {
    if (frames.length === 0) return 0;
    const lastTs = frames[frames.length - 1]?.timestamp ?? 0;
    return lastTs >= 1e4 ? lastTs / 1000 : lastTs;
  }, [frames]);

  const handleSaveToRegistry = async () => {
    if (!selectedVideo?.id || !moveName.trim()) return;
    setIsSaving(true);
    try {
      await saveMoveToRegistry({
        videoId: selectedVideo.id,
        startTimeSec: 0,
        endTimeSec: durationSec || 999,
        label: moveName.trim(),
        category: category.trim() || "General",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!videos.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No videos with motion_dna. Upload and process a video first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Label>Ideal move (video)</Label>
        <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select video" />
          </SelectTrigger>
          <SelectContent>
            {videos.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.title}
                {v.bpm != null ? ` · ${v.bpm} BPM` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedVideo && selectedVideo.bpm != null && (
          <span className="text-sm text-muted-foreground">
            {selectedVideo.bpm} BPM
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              3D playback (gold standard)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square max-h-[320px] w-full overflow-hidden rounded-md border bg-black">
              <canvas
                ref={canvasRef}
                className="h-full w-full object-contain"
                width={320}
                height={320}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Frame {playbackFrameIndex + 1} / {frames.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Hip tilt &amp; foot velocity (8-count)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="count" type="number" domain={[0, 8]} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="hipTilt"
                    name="Hip tilt"
                    stroke="hsl(var(--primary))"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="footVelocity"
                    name="Foot velocity"
                    stroke="#ec4899"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No motion data for selected video.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save to Registry</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compute the move signature (hip tilt, foot velocity, knee flexion
            curves) and add this video as a gold standard to the move registry.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="move-name">Move name</Label>
              <Input
                id="move-name"
                placeholder="e.g. Basic Step, Enchufla"
                value={moveName}
                onChange={(e) => setMoveName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Footwork, General"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveToRegistry}
            disabled={!signature || !moveName.trim() || isSaving}
            className="rounded-xl"
          >
            {isSaving ? "Saving…" : "Save to Registry"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

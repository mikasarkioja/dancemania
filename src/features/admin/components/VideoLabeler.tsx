"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { DanceInstructions, MoveSegment, MotionDNA, SuggestedLabel } from "@/types/dance";
import type { SuggestedSegment } from "@/engines/segmentation";
import { runSegmentationAsync } from "@/engines/runSegmentationWorker";
import {
  findNearestBeat,
  getNextBeat,
  getPrevBeat,
} from "@/lib/utils/rhythm-snap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, Plus, Trash2, Wand2, Check, Sparkles, X } from "lucide-react";

const PATTERNS = [
  "Box-step",
  "Pendulo",
  "Completo",
  "Dile que no",
  "Enchufla",
  "Cross body lead",
  "Open break",
  "Other",
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface VideoLabelerProps {
  videoUrl: string;
  videoId?: string;
  instructions: DanceInstructions;
  onSave: (instructions: DanceInstructions) => void;
  disabled?: boolean;
  /** Optional motion_dna for auto-labeling (Magic Wand). */
  motionDna?: MotionDNA | null;
  /** Beat timestamps (seconds) for beat-snap; from metadata.beat_timestamps. */
  beatTimestamps?: number[];
  /** Registry-based suggestions (Scanner); show ghost blocks and Approve/Reject. */
  suggestedLabels?: SuggestedLabel[];
  /** Run Scanner (compare motion_dna to move_registry), then refresh. */
  onRunAutoLabel?: () => Promise<{ ok: boolean; error?: string; suggestedLabels?: SuggestedLabel[] }>;
  onApproveSuggestion?: (s: SuggestedLabel) => Promise<{ ok: boolean; error?: string }>;
  onRejectSuggestion?: (s: SuggestedLabel) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Teacher labeling dashboard: video player with timeline, Start/End Move buttons,
 * pattern dropdown, and teacher instruction per segment. Saves to dance_library.instructions.
 */
const REVIEW_NEEDED_THRESHOLD = 0.6;

export function VideoLabeler({
  videoUrl,
  videoId,
  instructions,
  onSave,
  disabled = false,
  motionDna = null,
  beatTimestamps = [],
  suggestedLabels = [],
  onRunAutoLabel,
  onApproveSuggestion,
  onRejectSuggestion,
}: VideoLabelerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [segments, setSegments] = useState<MoveSegment[]>(instructions);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [pattern, setPattern] = useState<string>(PATTERNS[0]);
  const [teacherInstruction, setTeacherInstruction] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedSegment[]>([]);
  const [scanning, setScanning] = useState(false);
  const [autoLabeling, setAutoLabeling] = useState(false);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const beats = beatTimestamps.length > 0 ? beatTimestamps : null;

  const snap = useCallback(
    (t: number) => (beats ? findNearestBeat(t, beats) : t),
    [beats]
  );

  useEffect(() => {
    setSegments(instructions);
  }, [instructions]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoadedMetadata = () => setDuration(v.duration);
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("timeupdate", onTimeUpdate);
    if (v.duration && !Number.isNaN(v.duration)) setDuration(v.duration);
    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoUrl]);

  const handleSeek = useCallback(
    (value: number[]) => {
      const t = value[0];
      const seekTime = snap(t);
      if (videoRef.current) {
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
      }
    },
    [snap]
  );

  const handleStartMove = useCallback(() => {
    const t = videoRef.current?.currentTime ?? 0;
    setStartTime(snap(t));
    setEndTime(null);
  }, [snap]);

  const handleEndMove = useCallback(() => {
    const t = videoRef.current?.currentTime ?? 0;
    setEndTime(snap(t));
  }, [snap]);

  const handleAddSegment = useCallback(() => {
    const rawStart = startTime ?? currentTime;
    const rawEnd = endTime ?? currentTime;
    const start = beats ? snap(rawStart) : rawStart;
    const end = beats ? snap(rawEnd) : rawEnd;
    if (start >= end) return;
    const newSegment: MoveSegment = {
      startTime: start,
      endTime: end,
      pattern,
      teacherInstruction: teacherInstruction.trim() || pattern,
    };
    setSegments((prev) => [...prev, newSegment].sort((a, b) => a.startTime - b.startTime));
    setStartTime(null);
    setEndTime(null);
    setTeacherInstruction("");
  }, [startTime, endTime, pattern, teacherInstruction, currentTime, beats, snap]);

  const handleRemoveSegment = useCallback((index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    onSave(segments);
  }, [segments, onSave]);

  const handleMagicWand = useCallback(async () => {
    if (!motionDna?.frames?.length) return;
    setScanning(true);
    try {
      const result = await runSegmentationAsync(motionDna, 30);
      setSuggestions(result);
    } finally {
      setScanning(false);
    }
  }, [motionDna]);

  const handleRunAutoLabel = useCallback(async () => {
    if (!onRunAutoLabel) return;
    setAutoLabeling(true);
    try {
      await onRunAutoLabel();
    } finally {
      setAutoLabeling(false);
    }
  }, [onRunAutoLabel]);

  const handleConfirmSuggestion = useCallback((index: number) => {
    const sug = suggestions[index];
    if (!sug) return;
    const labelName = sug.label.replace(/^Suggested:\s*/i, "").trim();
    const start = beats ? snap(sug.start) : sug.start;
    const end = beats ? snap(sug.end) : sug.end;
    const newSegment: MoveSegment = {
      startTime: start,
      endTime: end,
      pattern: PATTERNS.includes(labelName) ? labelName : labelName || "Other",
      teacherInstruction: labelName || "Suggested move",
    };
    setSegments((prev) => [...prev, newSegment].sort((a, b) => a.startTime - b.startTime));
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }, [suggestions, beats, snap]);

  const handleNudgeSegment = useCallback(
    (index: number, direction: "prev" | "next") => {
      if (!beats || index < 0 || index >= segments.length) return;
      const seg = segments[index];
      if (direction === "prev") {
        const newStart = getPrevBeat(seg.startTime, beats);
        if (newStart == null) return;
        if (newStart >= seg.endTime) return;
        setSegments((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, startTime: newStart } : s
          )
        );
      } else {
        const newEnd = getNextBeat(seg.endTime, beats);
        if (newEnd == null) return;
        if (newEnd <= seg.startTime) return;
        setSegments((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, endTime: newEnd } : s
          )
        );
      }
    },
    [beats, segments]
  );

  useEffect(() => {
    if (!beats || selectedSegmentIndex == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNudgeSegment(selectedSegmentIndex, "prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNudgeSegment(selectedSegmentIndex, "next");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beats, selectedSegmentIndex, handleNudgeSegment]);

  return (
    <Card className="w-full max-w-3xl overflow-hidden">
      <CardHeader>
        <CardTitle>Move labeling</CardTitle>
        <CardDescription>
          Mark move segments and add pattern + teacher instruction for overlay
          text during playback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Responsive video player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="h-full w-full object-contain"
            preload="metadata"
            playsInline
          />
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Timeline</Label>
          <div className="flex items-center gap-2">
            <span className="w-10 text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <Slider
              className="flex-1"
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              disabled={disabled}
            />
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
          {/* Timeline strip: beat grid + segment markers */}
          {duration > 0 && (segments.length > 0 || suggestions.length > 0 || suggestedLabels.length > 0 || (beats && beats.length > 0)) && (
            <div className="space-y-1">
              {/* Beat grid (light grey vertical lines) + segment blocks */}
              {(segments.length > 0 || (beats && beats.length > 0)) && (
                <div className="relative h-6 w-full overflow-hidden rounded bg-secondary">
                  {beats &&
                    beats
                      .filter((t) => t >= 0 && t <= duration)
                      .map((t, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full w-px bg-muted-foreground/25"
                          style={{ left: `${(t / duration) * 100}%` }}
                          aria-hidden
                        />
                      ))}
                  {segments.map((seg, i) => (
                    <motion.div
                      key={i}
                      layout
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      className="absolute top-0 h-full rounded bg-primary/60"
                      style={{
                        left: `${(seg.startTime / duration) * 100}%`,
                        width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
                      }}
                      title={`${seg.pattern}: ${seg.teacherInstruction}`}
                    />
                  ))}
                </div>
              )}
              {/* Registry suggestions (Run auto label) */}
              {duration > 0 && suggestedLabels.length > 0 && (
                <div className="relative h-6 w-full overflow-visible rounded bg-secondary/60">
                  {suggestedLabels.map((s, i) => (
                    <div
                      key={i}
                      className="absolute top-0 flex h-full items-center gap-1 rounded border border-amber-500/60 bg-amber-500/25 px-1"
                      style={{
                        left: `${(s.startTime / duration) * 100}%`,
                        width: `${((s.endTime - s.startTime) / duration) * 100}%`,
                        minWidth: "80px",
                      }}
                      title={`${s.move_name}${s.similarity != null ? ` (${(s.similarity * 100).toFixed(0)}%)` : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground">
                        {s.move_name}
                      </span>
                      {s.similarity != null && (
                        <span className="shrink-0 text-[9px] text-muted-foreground">
                          {(s.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                      {onApproveSuggestion && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => onApproveSuggestion(s)}
                          disabled={disabled}
                          aria-label="Approve"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      {onRejectSuggestion && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => onRejectSuggestion(s)}
                          disabled={disabled}
                          aria-label="Reject"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Ghost blocks (Magic Wand suggestions) */}
              {duration > 0 && suggestions.length > 0 && (
                <div className="relative h-6 w-full overflow-visible rounded bg-secondary/60">
                  {suggestions.map((sug, i) => {
                    const isReviewNeeded = sug.confidence < REVIEW_NEEDED_THRESHOLD;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 flex h-full items-center gap-1 rounded border px-1"
                        style={{
                          left: `${(sug.start / duration) * 100}%`,
                          width: `${((sug.end - sug.start) / duration) * 100}%`,
                          minWidth: "80px",
                          backgroundColor: isReviewNeeded
                            ? "rgba(234, 179, 8, 0.4)"
                            : "rgba(59, 130, 246, 0.35)",
                          borderColor: isReviewNeeded ? "rgb(234, 179, 8)" : "rgba(59, 130, 246, 0.6)",
                        }}
                        title={`${sug.label} (${(sug.confidence * 100).toFixed(0)}%)`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground">
                          {isReviewNeeded ? "Review needed" : sug.label.replace(/^Suggested:\s*/i, "")}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => handleConfirmSuggestion(i)}
                          disabled={disabled}
                          aria-label="Confirm segment"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start / End Move + Pattern + Instruction */}
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartMove}
            disabled={disabled}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Move
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEndMove}
            disabled={disabled}
          >
            <Square className="mr-2 h-4 w-4" />
            End Move
          </Button>
          {startTime != null && (
            <span className="text-xs text-muted-foreground">
              {formatTime(startTime)}
              {endTime != null ? ` → ${formatTime(endTime)}` : ""}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pattern">Pattern</Label>
            <Select value={pattern} onValueChange={setPattern} disabled={disabled}>
              <SelectTrigger id="pattern">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERNS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instruction">Teacher instruction</Label>
            <Input
              id="instruction"
              placeholder="e.g. Lead with your frame"
              value={teacherInstruction}
              onChange={(e) => setTeacherInstruction(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddSegment}
            disabled={disabled || startTime == null || endTime == null}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add segment
          </Button>
          {motionDna?.frames?.length != null && motionDna.frames.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMagicWand}
              disabled={disabled || scanning}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {scanning ? "Scanning…" : "Magic Wand"}
            </Button>
          )}
          {onRunAutoLabel && videoId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunAutoLabel}
              disabled={disabled || autoLabeling}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {autoLabeling ? "Running…" : "Run auto label"}
            </Button>
          )}
        </div>

        {/* List of segments */}
        {segments.length > 0 && (
          <div className="space-y-2">
            <Label>Segments</Label>
            {beats && (
              <p className="text-xs text-muted-foreground">
                Select a segment and use ← / → to nudge to previous/next beat.
              </p>
            )}
            <ul className="space-y-1 rounded-md border p-2">
              {segments.map((seg, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm ${
                    selectedSegmentIndex === i ? "bg-primary/10 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => setSelectedSegmentIndex(i)}
                  >
                    <span className="text-muted-foreground">
                      {formatTime(seg.startTime)}–{formatTime(seg.endTime)}
                    </span>{" "}
                    <span className="font-medium">{seg.pattern}</span>{" "}
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {seg.teacherInstruction}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleRemoveSegment(i)}
                    disabled={disabled}
                    aria-label="Remove segment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={handleSave} disabled={disabled}>
          Save instructions
        </Button>
      </CardContent>
    </Card>
  );
}

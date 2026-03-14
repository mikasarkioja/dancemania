"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Circle, Square } from "lucide-react";
import type { MotionDNA, PoseFrame, PoseData } from "@/types/dance";
import { drawSkeleton } from "@/lib/utils/skeleton-canvas";
import {
  calculateSimilarity,
  getMatchingJointKeys,
} from "@/engines/comparison-engine";
import { createClient } from "@/lib/supabase/client";
import { generateAndSaveCoachingFeedback } from "@/app/actions/generate-coaching-feedback";
import {
  generateSessionNames,
  updatePracticeSessionName,
} from "@/app/actions/generate-session-names";
import { CoachingCard } from "@/components/coaching/CoachingCard";
import { SessionNamePicker } from "./SessionNamePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPoseFrameFromLandmarks,
  JOINT_KEY_TO_MP_INDEX,
} from "../utils/mediapipe-pose-to-frame";
import { useComparisonWorker } from "@/hooks/useComparisonWorker";
import type { JointGroup } from "@/engines/comparison.worker";
import { Logo } from "@/components/brand/Logo";

const FPS = 30;
const TEACHER_GHOST_COLOR = "rgba(196, 181, 253, 0.5)";
const STUDENT_SKELETON_COLOR = "hsl(var(--primary))";
const COUNT_IN_SEC = 3;

/** Pro tips by worst joint group (champagne-and-rose, boutique-instructor tone). */
function getProTipsForJointGroup(group: JointGroup): string[] {
  switch (group) {
    case "Hips":
      return [
        "Drive movement from your core—let your hips lead the Cuban motion.",
        "Keep hip movement smooth and intentional; avoid locking the pelvis.",
        "Match the teacher's hip timing; the pulse should feel natural, not forced.",
      ];
    case "Feet":
      return [
        "Check your weight distribution and foot placement on each step.",
        "Stay on the balls of your feet for quicker direction changes.",
        "Match the teacher's foot timing; don't rush the transitions.",
      ];
    case "Frame":
      return [
        "Maintain a soft but stable frame from shoulders to hands.",
        "Keep your shoulders relaxed and back—let your arms follow your body.",
        "Your frame should feel connected, not rigid; think elegant extension.",
      ];
    default:
      return [
        "Review the reference and try again—focus on one area at a time.",
        "Small adjustments in posture and timing add up to a cleaner performance.",
      ];
  }
}

export interface PracticeCaptureProps {
  videoId: string;
  title: string;
  videoUrl: string;
  motionDna: MotionDNA | null;
  moveId?: string | null;
  /** Genre for coaching terminology (On1, Frame, Cuban Motion). Default "Salsa". */
  genre?: "Salsa" | "Bachata";
  /** BPM for Creative Director session naming (optional). */
  bpm?: number | null;
  instructions?: { startTime: number; endTime: number; pattern: string }[];
}

export function PracticeCapture({
  videoId,
  title,
  videoUrl,
  motionDna,
  moveId = null,
  genre = "Salsa",
  bpm = null,
  instructions = [],
}: PracticeCaptureProps) {
  const router = useRouter();
  const {
    isProcessing,
    result: workerResult,
    calibrateAndCompare,
  } = useComparisonWorker();
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const [teacherTime, setTeacherTime] = useState(0);
  const [recording, setRecording] = useState(false);
  const [countDown, setCountDown] = useState<number | null>(null);
  const [studentFrames, setStudentFrames] = useState<PoseFrame[]>([]);
  const [currentStudentFrame, setCurrentStudentFrame] =
    useState<PoseFrame | null>(null);
  const [similarity, setSimilarity] = useState(0);
  const [showSparkle, setShowSparkle] = useState(false);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastCoachingResult, setLastCoachingResult] = useState<{
    score: number;
    proTips: string[];
    metrics?: {
      tensionAvg: number;
      isolationAvg: number;
      placementAvg: number;
      alignedPairs: number;
    };
    correctionTips?: {
      message: string;
      count?: number;
      severity?: "low" | "medium" | "high";
    }[];
  } | null>(null);
  const [namePickerSessionId, setNamePickerSessionId] = useState<string | null>(
    null
  );
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [nameRolling, setNameRolling] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const teacherFrameRef = useRef<PoseFrame | null>(null);

  const teacherFrames = useMemo(
    () => motionDna?.frames?.filter((f) => f.partner_id === 0) ?? [],
    [motionDna?.frames]
  );
  const teacherFrameAtTime =
    motionDna && teacherTime >= 0
      ? (() => {
          const idx = Math.floor(teacherTime * FPS);
          const frame =
            teacherFrames[idx] ?? teacherFrames[teacherFrames.length - 1];
          return frame ?? null;
        })()
      : null;
  teacherFrameRef.current = teacherFrameAtTime ?? null;

  useEffect(() => {
    const v = teacherVideoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setTeacherTime(v.currentTime);
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoUrl]);

  const startWebcam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      const v = webcamVideoRef.current;
      if (v) {
        v.srcObject = s;
        await v.play();
      }
    } catch (e) {
      console.warn("Webcam not available", e);
    }
  }, []);

  useEffect(() => {
    startWebcam();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startWebcam]);

  const tick = useCallback(() => {
    const canvas = webcamCanvasRef.current;
    const webcamVideo = webcamVideoRef.current;
    if (!canvas || !webcamVideo || !webcamVideo.videoWidth) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(webcamVideo, 0, 0, w, h);

    const teacherFrame = teacherFrameAtTime;
    const studentFrame = currentStudentFrame;

    if (teacherFrame?.joints && motionDna) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = TEACHER_GHOST_COLOR;
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(196, 181, 253, 0.8)";
      ctx.shadowBlur = 8;
      drawSkeleton(ctx, teacherFrame.joints, w, h, TEACHER_GHOST_COLOR, 2);
      ctx.restore();
    }

    if (studentFrame?.joints) {
      const jointMatches =
        teacherFrame?.joints &&
        getMatchingJointKeys(studentFrame, teacherFrame, 0.08);
      drawSkeleton(ctx, studentFrame.joints, w, h, STUDENT_SKELETON_COLOR, 2, {
        jointMatches: jointMatches ?? undefined,
      });
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [teacherFrameAtTime, currentStudentFrame, motionDna]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const recordingStartRef = useRef<number>(0);
  useEffect(() => {
    if (!recording) {
      recordingStartRef.current = 0;
      return;
    }
    recordingStartRef.current = Date.now();
    const interval = setInterval(() => {
      const teacherFrame = teacherFrameRef.current;
      if (!teacherFrame?.joints) return;
      const startTs = recordingStartRef.current;
      const ts = Date.now() - startTs;
      const landmarks: {
        x: number;
        y: number;
        z?: number;
        visibility?: number;
      }[] = Array(33)
        .fill(null)
        .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
      Object.entries(teacherFrame.joints).forEach(([key, j]) => {
        const idx = JOINT_KEY_TO_MP_INDEX[key];
        if (idx != null) {
          landmarks[idx] = {
            x: j.x + (Math.random() - 0.5) * 0.04,
            y: j.y + (Math.random() - 0.5) * 0.04,
            z: j.z ?? 0,
            visibility: j.visibility,
          };
        }
      });
      const frame = buildPoseFrameFromLandmarks(ts, landmarks, 0);
      setCurrentStudentFrame(frame);
      setStudentFrames((prev) => [...prev.slice(-FPS * 60), frame]);
    }, 1000 / FPS);
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    if (!teacherFrameAtTime || !currentStudentFrame) {
      setSimilarity(0);
      return;
    }
    const sim = calculateSimilarity(currentStudentFrame, teacherFrameAtTime);
    setSimilarity(sim.overall);
    if (sim.overall >= 0.9) setShowSparkle(true);
  }, [teacherFrameAtTime, currentStudentFrame]);

  useEffect(() => {
    if (!showSparkle) return;
    const t = setTimeout(() => setShowSparkle(false), 800);
    return () => clearTimeout(t);
  }, [showSparkle]);

  const handleStart = useCallback(() => {
    setCountDown(COUNT_IN_SEC);
    setStudentFrames([]);
    setCurrentStudentFrame(null);
  }, []);

  useEffect(() => {
    if (countDown === null) return;
    if (countDown <= 0) {
      setCountDown(null);
      setRecording(true);
      return;
    }
    const t = setTimeout(() => setCountDown(countDown - 1), 1000);
    return () => clearTimeout(t);
  }, [countDown]);

  const handleStop = useCallback(() => {
    setRecording(false);
    if (studentFrames.length === 0) return;
    setSaving(true);
    const frames = studentFrames;
    const teacher = teacherFrames;
    calibrateAndCompare(frames, teacher)
      .then(async (res) => {
        setLastCoachingResult({
          score: res.harmonyScore,
          proTips: getProTipsForJointGroup(res.worstJointGroup),
          metrics: {
            tensionAvg: res.harmonyScore / 100,
            isolationAvg: res.harmonyScore / 100,
            placementAvg: res.harmonyScore / 100,
            alignedPairs: res.pathLength ?? 0,
          },
          correctionTips: [
            {
              message: `Focus on ${res.worstJointGroup.toLowerCase()} for a stronger match.`,
              severity: "medium",
            },
          ],
        });
        if (res.harmonyScore > 85) setShowSparkle(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const studentMotion: PoseData = {
          frames,
          durationMs: frames[frames.length - 1]?.timestamp ?? 0,
          source: "student",
        };
        if (user) {
          const { data: sessionRow, error: insertError } = await supabase
            .from("practice_sessions")
            .insert({
              user_id: user.id,
              video_id: videoId,
              ...(moveId ? { move_id: moveId } : {}),
              student_motion_data: studentMotion,
              score_total: res.harmonyScore,
              metrics: {
                worstJointGroup: res.worstJointGroup,
                timingOffsetMs: res.timingOffsetMs,
                harmonyScore: res.harmonyScore,
              },
            })
            .select("id")
            .single();
          if (!insertError && sessionRow?.id) {
            await generateAndSaveCoachingFeedback(
              sessionRow.id,
              {
                score: res.harmonyScore / 100,
                correctionTips: [
                  {
                    message: `Focus on ${res.worstJointGroup.toLowerCase()} for a stronger match.`,
                    count: 1,
                    severity: "medium",
                  },
                ],
                metrics: {
                  tensionAvg: res.harmonyScore / 100,
                  isolationAvg: res.harmonyScore / 100,
                  placementAvg: res.harmonyScore / 100,
                  alignedPairs: res.pathLength ?? 0,
                },
              },
              genre
            );
            const naming = await generateSessionNames({
              bpm: bpm ?? 0,
              genre,
              top_moves: instructions.map((i) => i.pattern),
            });
            setSuggestedNames(naming.names);
            setNamePickerSessionId(sessionRow.id);
          }
        }
      })
      .catch(() => {
        setLastCoachingResult({
          score: 0,
          proTips: [
            "Comparison could not be completed. Try again or check your camera.",
          ],
        });
      })
      .finally(() => setSaving(false));
  }, [
    studentFrames,
    teacherFrames,
    videoId,
    moveId,
    genre,
    bpm,
    instructions,
    calibrateAndCompare,
  ]);

  const handlePickSessionName = useCallback(
    async (name: string) => {
      if (!namePickerSessionId) return;
      await updatePracticeSessionName(namePickerSessionId, name);
      setNamePickerSessionId(null);
    },
    [namePickerSessionId]
  );

  const handleRollSessionNames = useCallback(async () => {
    setNameRolling(true);
    try {
      const naming = await generateSessionNames({
        bpm: bpm ?? 0,
        genre,
        top_moves: instructions.map((i) => i.pattern),
      });
      setSuggestedNames(naming.names);
    } finally {
      setNameRolling(false);
    }
  }, [bpm, genre, instructions]);

  return (
    <div className="flex flex-col gap-4 relative">
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            key="refining-overlay"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="absolute inset-0 bg-brand-champagne/90"
              style={{ backgroundColor: "rgba(253, 242, 248, 0.92)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
            <motion.div
              className="relative flex flex-col items-center justify-center rounded-[2rem] border border-white/40 bg-white/30 px-12 py-10 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                minWidth: "min(85vw, 300px)",
                minHeight: "min(50vmin, 220px)",
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Logo size={80} className="text-brand-rose" />
              </motion.div>
              <motion.p
                className="mt-6 text-center font-serif text-lg lowercase tracking-wide text-foreground/90"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                Refining your signature... ✨
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="overflow-hidden border-border/40 rounded-2xl bg-card/80 shadow-lg backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg tracking-airy text-primary">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={teacherVideoRef}
                src={videoUrl}
                className="h-full w-full object-contain"
                playsInline
                muted
                loop
                preload="metadata"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/40 rounded-2xl bg-card/80 shadow-lg backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg tracking-airy text-primary">
              Your camera
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={webcamVideoRef}
                className="absolute inset-0 h-full w-full object-contain mirror"
                playsInline
                muted
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas
                ref={webcamCanvasRef}
                className="absolute inset-0 h-full w-full object-contain"
                width={640}
                height={480}
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="rounded-full bg-primary/40 blur-xl border-2 border-primary/60"
                  style={{
                    width: 80 + similarity * 120,
                    height: 80 + similarity * 120,
                    boxShadow: `0 0 ${40 + similarity * 60}px hsl(var(--primary) / 0.6)`,
                  }}
                  animate={{
                    scale: 0.8 + similarity * 0.4,
                    opacity: 0.3 + similarity * 0.5,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
              </div>
              <AnimatePresence>
                {showSparkle && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Sparkles className="h-16 w-16 text-accent drop-shadow-lg" />
                    </motion.div>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-accent"
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{
                          scale: 1,
                          x: Math.cos((i / 6) * Math.PI * 2) * 40,
                          y: Math.sin((i / 6) * Math.PI * 2) * 40,
                          opacity: 0,
                        }}
                        transition={{ duration: 0.6 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          {instructions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Move</span>
              <Select
                value={String(selectedMoveIndex)}
                onValueChange={(v) => setSelectedMoveIndex(Number(v))}
              >
                <SelectTrigger className="w-[180px] rounded-xl border-border/40 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instructions.map((seg, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {seg.pattern}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {countDown !== null ? (
            <motion.div
              className="flex h-14 min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-primary-foreground font-medium"
              key="count"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              {countDown}
            </motion.div>
          ) : recording ? (
            <Button
              size="lg"
              className="min-h-[48px] rounded-xl bg-destructive/90 hover:bg-destructive text-destructive-foreground"
              onClick={handleStop}
              disabled={saving}
            >
              <Square className="mr-2 h-5 w-5" />
              Stop & Save
            </Button>
          ) : (
            <Button
              size="lg"
              className="min-h-[48px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleStart}
            >
              <Circle className="mr-2 h-5 w-5 fill-current" />
              Start practice
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Similarity: {Math.round(similarity * 100)}%
        </p>
      </div>

      <AnimatePresence mode="wait">
        {namePickerSessionId && (
          <motion.div
            key="name-picker"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
              mass: 0.8,
            }}
          >
            <Card className="overflow-hidden border-border/40 rounded-2xl bg-card/80 shadow-lg backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg tracking-airy text-primary">
                  Name your session
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a boutique name or roll for new suggestions.
                </p>
              </CardHeader>
              <CardContent>
                <SessionNamePicker
                  names={suggestedNames}
                  onSelect={handlePickSessionName}
                  onRoll={handleRollSessionNames}
                  rolling={nameRolling}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
        {lastCoachingResult && !namePickerSessionId && (
          <motion.div
            key="coaching-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
              mass: 0.8,
            }}
          >
            <CoachingCard
              score={lastCoachingResult.score}
              proTips={lastCoachingResult.proTips}
              metrics={lastCoachingResult.metrics}
              correctionTips={lastCoachingResult.correctionTips}
              onRetry={() => setLastCoachingResult(null)}
              onNext={() => router.push("/library")}
              nextLabel="Back to library"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

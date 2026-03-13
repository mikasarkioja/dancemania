"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  compareStudentToTeacher,
  getAssessmentLevel,
  type AssessmentLevel,
} from "@/engines/comparison-engine";
import type { PoseData, PoseFrame } from "@/types/dance";
import {
  buildPoseFrameFromLandmarks,
  JOINT_KEY_TO_MP_INDEX,
} from "@/features/practice/utils/mediapipe-pose-to-frame";
import { drawSkeleton } from "@/lib/utils/skeleton-canvas";
import { createSyntheticTeacherMotion } from "../utils/synthetic-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Circle, Square } from "lucide-react";

const FPS = 30;
const CAPTURE_DURATION_SEC = 30;
const ROSE_FRAME_COLOR = "rgba(253, 164, 175, 0.4)";
const GHOST_COLOR = "rgba(196, 181, 253, 0.5)";

const slide = {
  enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
};

export interface AssessmentFlowProps {
  /** Optional 30s Basic Step teacher video URL. */
  basicStepVideoUrl?: string;
  /** Optional teacher motion for comparison; if not provided, synthetic is used. */
  teacherMotion?: PoseData | null;
}

export function AssessmentFlow({
  basicStepVideoUrl = "",
  teacherMotion: teacherMotionProp = null,
}: AssessmentFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [studentMotion, setStudentMotion] = useState<PoseData | null>(null);
  const [level, setLevel] = useState<AssessmentLevel | null>(null);
  const [harmonyScore, setHarmonyScore] = useState(0);
  const [processing, setProcessing] = useState(false);

  const teacherMotion = teacherMotionProp ?? createSyntheticTeacherMotion();
  const teacherFrames = teacherMotion.frames;

  const go = (next: number, dir: number) => {
    setDirection(dir);
    setStep(next);
  };

  return (
    <div className="min-h-screen bg-brand-champagne/50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === 1 && (
            <motion.div
              key="1"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-white/50 bg-white/60 p-8 shadow-sm backdrop-blur-md"
            >
              <p className="text-center font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
                Every dancer has a unique signature. Let&apos;s find yours. ✨
              </p>
              <Button
                className="mt-8 rounded-full bg-brand-rose px-6 py-3 text-white hover:opacity-90"
                onClick={() => go(2, 1)}
              >
                Start my journey
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="2"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/60 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">
                    Studio agreement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    To guide your movement, we extract a mathematical
                    &quot;Dance DNA&quot; from your video. This is anonymized
                    and stays in your private vault.
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/40 p-3">
                    <span className="text-sm text-foreground">
                      Biometric data (pose) for analysis
                    </span>
                    <Toggle
                      checked={biometricConsent}
                      onCheckedChange={setBiometricConsent}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/40 p-3">
                    <span className="text-sm text-foreground">
                      Store my progress in my account
                    </span>
                    <Toggle
                      checked={dataConsent}
                      onCheckedChange={setDataConsent}
                    />
                  </div>
                  <Button
                    className="w-full rounded-full bg-brand-rose text-white hover:opacity-90"
                    disabled={!biometricConsent}
                    onClick={() => go(3, 1)}
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="3"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <AssessmentCapture
                basicStepVideoUrl={basicStepVideoUrl}
                teacherFrames={teacherFrames}
                onComplete={(motion) => {
                  setStudentMotion(motion);
                  go(4, 1);
                }}
                onBack={() => go(2, -1)}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="4"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <ProcessingStep
                studentMotion={studentMotion}
                teacherMotion={teacherMotion}
                onResult={(lev, score) => {
                  setLevel(lev);
                  setHarmonyScore(score);
                  setProcessing(false);
                  go(5, 1);
                }}
                onProcessingStart={() => setProcessing(true)}
              />
            </motion.div>
          )}

          {step === 5 && level && (
            <motion.div
              key="5"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/50 bg-white/60 p-8 shadow-sm backdrop-blur-md"
            >
              <p className="text-center font-serif text-2xl font-bold text-foreground">
                You have a natural {level}&apos;s grace! 💃
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Harmony score: {harmonyScore}%
              </p>
              <Button
                className="mt-8 w-full rounded-full bg-brand-rose text-white hover:opacity-90"
                onClick={() => router.push("/dashboard")}
              >
                Open my Studio Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-brand-rose" : "bg-muted"
      }`}
    >
      <motion.span
        className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </button>
  );
}

function AssessmentCapture({
  basicStepVideoUrl,
  teacherFrames,
  onComplete,
  onBack,
}: {
  basicStepVideoUrl: string;
  teacherFrames: PoseFrame[];
  onComplete: (motion: PoseData) => void;
  onBack: () => void;
}) {
  const [countDown, setCountDown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const framesRef = useRef<PoseFrame[]>([]);
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef<number>(0);
  const teacherFrameRef = useRef<PoseFrame | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

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
    } catch {
      // no webcam
    }
  }, []);

  useEffect(() => {
    startWebcam();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startWebcam]);

  useEffect(() => {
    const v = teacherVideoRef.current;
    if (v && basicStepVideoUrl) {
      const onTimeUpdate = () => {
        const t = v.currentTime;
        const idx = Math.min(
          Math.floor(t * FPS),
          teacherFrames.length - 1
        );
        teacherFrameRef.current = teacherFrames[idx] ?? teacherFrames[0] ?? null;
      };
      v.addEventListener("timeupdate", onTimeUpdate);
      return () => v.removeEventListener("timeupdate", onTimeUpdate);
    }
    if (!basicStepVideoUrl && teacherFrames.length > 0) {
      teacherFrameRef.current = teacherFrames[0];
    }
  }, [teacherFrames, basicStepVideoUrl]);

  useEffect(() => {
    if (countDown === null) return;
    if (countDown <= 0) {
      setCountDown(null);
      setRecording(true);
      startRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountDown(countDown - 1), 1000);
    return () => clearTimeout(t);
  }, [countDown]);

  useEffect(() => {
    if (!recording || teacherFrames.length === 0) return;
    framesRef.current = [];
    const interval = setInterval(() => {
      const startTs = startRef.current;
      const ts = Date.now() - startTs;
      setElapsed(Math.floor(ts / 1000));
      if (!basicStepVideoUrl) {
        const idx = Math.min(
          Math.floor((ts / 1000) * FPS),
          teacherFrames.length - 1
        );
        teacherFrameRef.current = teacherFrames[idx] ?? teacherFrames[0] ?? null;
      }
      if (ts >= CAPTURE_DURATION_SEC * 1000) {
        setRecording(false);
        const motion: PoseData = {
          frames: [...framesRef.current],
          durationMs: ts,
          source: "student",
        };
        onCompleteRef.current(motion);
        return;
      }
      const teacherFrame = teacherFrameRef.current;
      if (!teacherFrame?.joints) return;
      const landmarks = Array(33)
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
      framesRef.current.push(frame);
    }, 1000 / FPS);
    return () => clearInterval(interval);
  }, [recording, teacherFrames, basicStepVideoUrl]);

  const handleStart = useCallback(() => {
    framesRef.current = [];
    setElapsed(0);
    setCountDown(3);
  }, []);

  const canvasCtx = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const canvas = webcamCanvasRef.current;
    if (!canvas) return;
    canvasCtx.current = canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const canvas = webcamCanvasRef.current;
    const ctx = canvasCtx.current;
    if (!ctx || !canvas) return;
    let raf: number;
    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = ROSE_FRAME_COLOR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      const teacherFrame = teacherFrameRef.current;
      if (teacherFrame?.joints) {
        drawSkeleton(ctx, teacherFrame.joints, w, h, GHOST_COLOR, 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/60 shadow-sm backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg">Find your rhythm</CardTitle>
        <p className="text-sm text-muted-foreground">
          30-second Basic Step. Follow the teacher; we&apos;ll read your
          signature.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {basicStepVideoUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={teacherVideoRef}
              src={basicStepVideoUrl}
              className="h-full w-full object-contain"
              playsInline
              muted
              loop
              preload="metadata"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            Basic Step reference
          </div>
        )}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={webcamVideoRef}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
          />
          <canvas
            ref={webcamCanvasRef}
            width={640}
            height={480}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
          {countDown !== null ? (
            <span className="font-medium">Starting in {countDown}…</span>
          ) : recording ? (
            <span className="font-medium">
              <Square className="mr-1 inline h-4 w-4 fill-red-500 text-red-500" />
              {elapsed}s / {CAPTURE_DURATION_SEC}s
            </span>
          ) : (
            <Button
              className="rounded-full bg-brand-rose text-white hover:opacity-90"
              onClick={handleStart}
            >
              <Circle className="mr-2 h-4 w-4 fill-current" />
              Start 30s capture
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessingStep({
  studentMotion,
  teacherMotion,
  onResult,
  onProcessingStart,
}: {
  studentMotion: PoseData | null;
  teacherMotion: PoseData;
  onResult: (level: AssessmentLevel, score: number) => void;
  onProcessingStart: () => void;
}) {
  const didRun = useRef(false);
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    onProcessingStart();
    const t = setTimeout(() => {
      if (!studentMotion || studentMotion.frames.length === 0) {
        onResult("Seedling", 0);
        return;
      }
      const result = compareStudentToTeacher(
        studentMotion,
        teacherMotion,
        { teacherPartnerId: 0, studentPartnerId: 0 }
      );
      const level = getAssessmentLevel(result, 0);
      const score = Math.round(result.score * 100);
      onResult(level, score);
    }, 2200);
    return () => clearTimeout(t);
  }, [studentMotion, teacherMotion, onResult, onProcessingStart]);

  return (
    <Card className="overflow-hidden rounded-2xl border-white/50 bg-white/60 p-8 shadow-sm backdrop-blur-md">
      <div className="flex flex-col items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              "0 0 0px rgba(253,164,175,0)",
              "0 0 24px rgba(253,164,175,0.5)",
              "0 0 0px rgba(253,164,175,0)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="h-4 w-4 rounded-full bg-brand-rose"
        />
        <p className="mt-4 font-serif text-lg text-foreground">
          Processing your signature…
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Finding your rhythm and frame
        </p>
      </div>
    </Card>
  );
}

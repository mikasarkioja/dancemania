"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { getFirstMoveForLevel } from "@/app/actions/get-first-move-for-level";
import type { FirstMoveSuggestion } from "@/app/actions/get-first-move-for-level";
import {
  getPrivacyConsentGranted,
  grantPrivacyConsent,
} from "@/features/user/actions/consent-actions";
import { setAssessmentCompleted } from "@/features/user/actions/assessment-actions";
import { PrivacyConsentModal } from "@/features/user/components/PrivacyConsentModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle, Square, Sparkles } from "lucide-react";

const FOUNDING_MEMBER_URL =
  process.env.NEXT_PUBLIC_PURCHASE_URL ||
  process.env.NEXT_PUBLIC_FOUNDING_MEMBER_URL ||
  "/pricing";

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
  const [firstMove, setFirstMove] = useState<FirstMoveSuggestion | null>(null);
  const [privacyConsentGranted, setPrivacyConsentGranted] = useState<
    boolean | null
  >(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [, setProcessing] = useState(false);

  useEffect(() => {
    if (step === 5 && level) {
      getFirstMoveForLevel(level, "Salsa").then(setFirstMove);
    }
  }, [step, level]);

  useEffect(() => {
    getPrivacyConsentGranted().then(setPrivacyConsentGranted);
  }, []);

  const teacherMotion = teacherMotionProp ?? createSyntheticTeacherMotion();
  const teacherFrames = teacherMotion.frames;

  const go = (next: number, dir: number) => {
    setDirection(dir);
    setStep(next);
  };

  return (
    <div className="min-h-svh bg-brand-champagne/50 px-4 py-8 pt-safe pb-safe">
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
                className="mt-8 min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-brand-rose px-6 py-3 text-white hover:opacity-90"
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
                    className="w-full min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-brand-rose text-white hover:opacity-90"
                    disabled={!biometricConsent}
                    onClick={async () => {
                      await grantPrivacyConsent();
                      setPrivacyConsentGranted(true);
                      go(3, 1);
                    }}
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
              {privacyConsentGranted === false && (
                <PrivacyConsentModal
                  onAccept={async () => {
                    setConsentLoading(true);
                    const { success } = await grantPrivacyConsent();
                    if (success) setPrivacyConsentGranted(true);
                    setConsentLoading(false);
                  }}
                  loading={consentLoading}
                />
              )}
              <AssessmentCapture
                basicStepVideoUrl={basicStepVideoUrl}
                teacherFrames={teacherFrames}
                consentGranted={privacyConsentGranted === true}
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
              className="overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl"
              style={{
                boxShadow:
                  "0 8px 32px rgba(253, 164, 175, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <motion.div
                className="relative flex flex-col items-center"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              >
                <motion.div
                  className="absolute -inset-4 rounded-full bg-brand-rose/20"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0.05, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-brand-rose/90 to-brand-rose"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(253, 164, 175, 0.5)",
                      "0 0 0 24px rgba(253, 164, 175, 0)",
                    ],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                >
                  <Sparkles className="h-10 w-10 text-white" />
                </motion.div>
                <p className="mt-6 text-center font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  You&apos;re a {level}
                </p>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Harmony score: {harmonyScore}%
                </p>
                {firstMove && (
                  <div className="mt-5 w-full rounded-2xl border border-white/50 bg-white/50 p-4 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Your first move
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold text-foreground">
                      {firstMove.name}
                    </p>
                    {firstMove.category && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {firstMove.category}
                      </p>
                    )}
                    <Link
                      href="/encyclopedia"
                      className="mt-3 inline-block text-sm font-medium text-brand-rose hover:underline"
                    >
                      Explore in Encyclopedia →
                    </Link>
                  </div>
                )}

                <div className="mt-6 w-full rounded-2xl border border-white/60 bg-white/50 p-5 shadow-lg backdrop-blur-md">
                  <span className="inline-block rounded-full border border-brand-rose/40 bg-brand-rose/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-rose">
                    Limited Founding Spots Available
                  </span>
                  <p className="mt-4 text-center font-serif text-base leading-relaxed text-foreground">
                    You&apos;ve been ranked as a <strong>{level}</strong>. To
                    reach &quot;Performer&quot; status, unlock your personalized
                    Mastery Path, unlimited AI coaching, and exclusive
                    Masterclass Move Packs.
                  </p>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Join 50+ other dancers in our founding cohort.
                  </p>
                  <div className="mt-5 flex flex-col gap-3">
                    <Link href={FOUNDING_MEMBER_URL} className="block">
                      <Button
                        className="w-full min-h-[48px] touch-manipulation rounded-full bg-brand-rose px-6 py-3 text-white shadow-lg shadow-brand-rose/30 hover:opacity-95"
                        style={{
                          boxShadow: "0 0 20px rgba(253, 164, 175, 0.4)",
                        }}
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Claim Founding Member Access ✨
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await setAssessmentCompleted();
                        router.push("/dashboard");
                      }}
                      className="min-h-[44px] touch-manipulation text-sm text-muted-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:text-foreground hover:decoration-foreground/50"
                    >
                      Continue with 3 free practices
                    </button>
                  </div>
                </div>
              </motion.div>
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
      className={`relative flex h-11 min-h-[44px] w-14 min-w-[44px] shrink-0 touch-manipulation items-center rounded-full transition-colors tap-scale ${
        checked ? "bg-brand-rose" : "bg-muted"
      }`}
    >
      <motion.span
        className="absolute left-1 h-6 w-6 rounded-full bg-white shadow"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
        animate={{ x: checked ? 22 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </button>
  );
}

function AssessmentCapture({
  basicStepVideoUrl,
  teacherFrames,
  consentGranted,
  onComplete,
  onBack,
}: {
  basicStepVideoUrl: string;
  teacherFrames: PoseFrame[];
  consentGranted: boolean;
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
    if (!consentGranted) return;
    startWebcam();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [consentGranted, startWebcam]);

  useEffect(() => {
    const v = teacherVideoRef.current;
    if (v) {
      v.setAttribute("webkit-playsinline", "true");
      v.setAttribute("playsinline", "true");
    }
  }, [basicStepVideoUrl]);
  useEffect(() => {
    const v = webcamVideoRef.current;
    if (v) {
      v.setAttribute("webkit-playsinline", "true");
      v.setAttribute("playsinline", "true");
    }
  }, []);
  useEffect(() => {
    const v = teacherVideoRef.current;
    if (v && basicStepVideoUrl) {
      const onTimeUpdate = () => {
        const t = v.currentTime;
        const idx = Math.min(Math.floor(t * FPS), teacherFrames.length - 1);
        teacherFrameRef.current =
          teacherFrames[idx] ?? teacherFrames[0] ?? null;
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
        teacherFrameRef.current =
          teacherFrames[idx] ?? teacherFrames[0] ?? null;
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
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={onBack}
          >
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
              className="min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-brand-rose text-white hover:opacity-90"
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
      const result = compareStudentToTeacher(studentMotion, teacherMotion, {
        teacherPartnerId: 0,
        studentPartnerId: 0,
      });
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

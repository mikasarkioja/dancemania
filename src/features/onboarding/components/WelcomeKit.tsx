"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Video, Brain, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { completeWelcomeKit } from "@/features/user/actions/welcome-kit-actions";

const SLIDES = [
  {
    id: "vision",
    title: "Welcome to the Digital Mirror",
    body: "Your journey from Seedling to Performer starts here. ✨",
    icon: Sparkles,
  },
  {
    id: "how",
    title: "How it works",
    steps: [
      { icon: Video, label: "Record your dance" },
      { icon: Brain, label: "AI analyzes your Motion DNA" },
      { icon: Award, label: "Receive your Boutique Coaching Card" },
    ],
  },
  {
    id: "privacy",
    title: "The Privacy Pact",
    body: "We see your rhythm, not your face. Facial data is never stored.",
    sub: "Your pose data stays in your account and powers only your practice and progress.",
    icon: Shield,
  },
];

const bloomVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 25,
      staggerChildren: 0.06,
    },
  },
  exit: { scale: 0.98, opacity: 0 },
};

export interface WelcomeKitProps {
  onComplete?: () => void;
}

/**
 * Test User Welcome Kit: glassmorphic overlay with Bloom entry.
 * Slide 3 integrates the Privacy Pact; consent is granted only on "Enter the Studio".
 */
export function WelcomeKit({ onComplete }: WelcomeKitProps) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  const handleEnterStudio = async () => {
    setActionError(null);
    setLoading(true);
    try {
      const result = await completeWelcomeKit();
      if (result.success) {
        onComplete?.();
        router.push("/onboarding");
        router.refresh();
        return;
      }
      const msg =
        result.error ??
        "Could not save your choice. Check your connection and try again.";
      setActionError(msg);
      toast.error(msg, {
        description:
          "If this keeps happening, your database may need the latest migrations (profiles.has_seen_welcome_kit).",
        duration: 8000,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleEnterStudio();
    } else {
      setSlideIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pt-safe pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-kit-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-[hsl(346,77%,50%)]/40 bg-white/90 shadow-2xl backdrop-blur-xl dark:bg-gray-900/90"
        style={{
          boxShadow:
            "0 8px 32px rgba(253, 164, 175, 0.15), inset 0 1px 0 rgba(255,255,255,0.7)",
          willChange: "transform",
          transform: "translateZ(0)",
        }}
        variants={bloomVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {slide.id === "vision" && (
              <motion.div
                key="vision"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <motion.div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[hsl(346,77%,50%)]/50 bg-[hsl(346,77%,50%)]/10"
                  style={{
                    willChange: "transform",
                    transform: "translateZ(0)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(253, 164, 175, 0.4)",
                      "0 0 0 20px rgba(253, 164, 175, 0)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                >
                  <Sparkles className="h-8 w-8 text-[hsl(346,77%,50%)]" />
                </motion.div>
                <h2
                  id="welcome-kit-title"
                  className="mt-6 font-serif text-2xl font-bold tracking-tight text-foreground"
                >
                  {slide.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {slide.body}
                </p>
              </motion.div>
            )}

            {slide.id === "how" && (
              <motion.div
                key="how"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-center font-serif text-xl font-bold tracking-tight text-foreground">
                  {slide.title}
                </h2>
                <ul className="mt-6 space-y-4">
                  {slide.steps!.map((step, i) => (
                    <motion.li
                      key={step.label}
                      className="flex items-center gap-4 rounded-xl border border-white/60 bg-white/50 p-4 dark:bg-white/5"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(346,77%,50%)]/15">
                        <step.icon className="h-6 w-6 text-[hsl(346,77%,50%)]" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {step.label}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {slide.id === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[hsl(346,77%,50%)]/40 bg-[hsl(346,77%,50%)]/10">
                  <Shield className="h-7 w-7 text-[hsl(346,77%,50%)]" />
                </div>
                <h2 className="mt-5 font-serif text-xl font-bold tracking-tight text-foreground">
                  {slide.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {slide.body}
                </p>
                {"sub" in slide && slide.sub && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {slide.sub}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  By entering the studio, you accept our privacy practices and
                  allow pose data to be used for your coaching.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-3">
            {actionError && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
              >
                {actionError}
              </p>
            )}
            <Button
              className="min-h-[48px] w-full touch-manipulation rounded-full bg-[hsl(346,77%,50%)] px-6 py-3 text-white shadow-lg shadow-[hsl(346,77%,50%)]/25 hover:opacity-90"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                <span className="font-medium">Entering…</span>
              ) : isLast ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Begin Initial Assessment
                </>
              ) : (
                "Continue"
              )}
            </Button>
            {!isLast && (
              <button
                type="button"
                onClick={() => setSlideIndex(SLIDES.length - 1)}
                className="min-h-[44px] text-sm text-muted-foreground touch-manipulation hover:text-foreground"
              >
                Skip to privacy
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlideIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === slideIndex
                  ? "w-6 bg-[hsl(346,77%,50%)]"
                  : "w-2 bg-[hsl(346,77%,50%)]/30"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

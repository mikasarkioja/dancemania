"use client";

/**
 * Boutique Studio splash screen: logo draw-on, champagne pulse, glassmorphism.
 * Wrap app content and set isReady when Supabase/MediaPipe (or other init) is done.
 * Example: <SplashScreen isReady={ready}>{children}</SplashScreen>
 */
import { motion, AnimatePresence } from "framer-motion";

/** Infinity / Dance DNA: left loop of figure-8 */
const RIBBON_1 =
  "M 50 50 C 22 50 22 22 50 22 C 78 22 78 50 50 50";
/** Infinity / Dance DNA: right loop of figure-8 */
const RIBBON_2 =
  "M 50 50 C 78 50 78 78 50 78 C 22 78 22 50 50 50";

export interface SplashScreenProps {
  isReady: boolean;
  children?: React.ReactNode;
  /** Optional status message; cycles if array. */
  status?: string | string[];
}

const DEFAULT_STATUS = [
  "preparing your studio...",
  "aligning the music... ✨",
];

export function SplashScreen({
  isReady,
  children,
  status = DEFAULT_STATUS,
}: SplashScreenProps) {
  const statusList = Array.isArray(status) ? status : [status];
  const statusText = statusList[0] ?? DEFAULT_STATUS[0];

  return (
    <>
      {children}
      <AnimatePresence>
        {!isReady && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit="exit"
            variants={{
              exit: {
                opacity: 0,
                filter: "blur(12px)",
                scale: 1.02,
                transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
              },
            }}
          >
            {/* Background with soft pulse */}
            <motion.div
              className="absolute inset-0 bg-brand-champagne"
              style={{ backgroundColor: "#FDF2F8" }}
              animate={{
                opacity: [0.98, 1, 0.98],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Glassmorphism container */}
            <motion.div
              className="relative flex flex-col items-center justify-center rounded-[2rem] border border-white/30 bg-white/25 px-16 py-14 shadow-2xl backdrop-blur-xl sm:px-20 sm:py-16"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.1,
              }}
              style={{
                minWidth: "min(85vw, 320px)",
                minHeight: "min(70vmin, 280px)",
              }}
            >
              {/* Logo: two intertwined ribbons (D / infinity) with draw-on animation */}
              <svg
                viewBox="0 0 100 100"
                className="h-[min(45vmin, 180px)] w-[min(45vmin, 180px)] shrink-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <defs>
                  <linearGradient
                    id="splash-ribbon-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FDA4AF" />
                    <stop offset="100%" stopColor="#EAB308" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <motion.path
                  d={RIBBON_1}
                  stroke="url(#splash-ribbon-gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 1.4,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.3,
                  }}
                />
                <motion.path
                  d={RIBBON_2}
                  stroke="url(#splash-ribbon-gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 1.4,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.5,
                  }}
                />
              </svg>

              {/* Status: elegant serif line + wide sans loading label */}
              <motion.p
                className="mt-8 text-center font-serif text-base lowercase tracking-wide text-foreground/80"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                {statusText}
              </motion.p>

              {/* Boutique loading: joint-marker style dots, 120 BPM pulse */}
              <motion.div
                className="mt-5 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.4 }}
                aria-hidden
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        "0 0 0px rgba(253,164,175,0)",
                        "0 0 20px rgba(253,164,175,0.4)",
                        "0 0 0px rgba(253,164,175,0)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      delay: i * 0.167,
                    }}
                    className="h-3 w-3 rounded-full bg-brand-rose"
                  />
                ))}
              </motion.div>

              <motion.p
                className="mt-3 text-center font-sans text-[11px] font-medium uppercase tracking-[0.4em] text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.4 }}
              >
                DanceAI
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

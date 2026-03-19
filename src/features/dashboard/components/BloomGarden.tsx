"use client";

import { motion } from "framer-motion";

const GROWTH_MULTIPLIER = 28; // log10(1000+1)*28 ≈ 84; log10(1)*28 = 0

function growthState(xp: number): number {
  return Math.min(1, (Math.log10(xp + 1) * GROWTH_MULTIPLIER) / 100);
}

export interface BloomGardenProps {
  omatase: number;
  persona: string;
}

export function BloomGarden({ omatase, persona }: BloomGardenProps) {
  const growth = growthState(omatase);
  const scale = 0.5 + growth * 0.6; // 0.5 -> 1.1
  const opacity = 0.4 + growth * 0.5;

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-[rgba(30,30,32,0.75)] p-8 shadow-xl backdrop-blur-xl"
      initial={{ opacity: 0.95 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.6 },
      }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#FDA4AF]/10 to-transparent pointer-events-none" />
      <p className="relative z-10 mb-1 text-xs font-medium uppercase tracking-widest text-[#FDA4AF]/90">
        Your garden
      </p>
      <p className="relative z-10 font-serif text-lg font-bold text-foreground">
        {persona}
      </p>
      <div className="relative z-10 mt-4 flex items-center justify-center">
        <motion.div
          className="flex items-end justify-center gap-1"
          style={{ transformOrigin: "center bottom" }}
          animate={{
            scale,
            transition: { type: "spring", stiffness: 120, damping: 20 },
          }}
        >
          {/* Stem */}
          <motion.div
            className="w-2 rounded-full bg-gradient-to-b from-[#E8B4B8] to-[#C9A0A4]"
            style={{ height: `${24 + growth * 32}px` }}
            animate={{
              scaleY: 1,
              opacity,
              transition: { duration: 0.8 },
            }}
          />
          {/* Leaves */}
          <motion.div
            className="flex -translate-x-1 gap-2"
            animate={{
              scale: 0.9 + growth * 0.2,
              opacity,
            }}
          >
            <motion.div
              className="h-4 w-6 rounded-full bg-[#FDF2F8]/90"
              style={{
                background: "linear-gradient(135deg, #FDF2F8 0%, #FDA4AF 100%)",
                boxShadow: "0 2px 8px rgba(253,164,175,0.3)",
              }}
              animate={{
                scale: [1, 1.05, 1],
                transition: {
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                },
              }}
            />
            <motion.div
              className="h-5 w-7 rounded-full"
              style={{
                background: "linear-gradient(135deg, #FDF2F8 0%, #FDA4AF 100%)",
                boxShadow: "0 2px 8px rgba(253,164,175,0.3)",
              }}
              animate={{
                scale: [1.05, 1, 1.05],
                transition: {
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                  delay: 0.3,
                },
              }}
            />
            <motion.div
              className="h-4 w-6 rounded-full"
              style={{
                background: "linear-gradient(135deg, #FDA4AF 0%, #FDF2F8 100%)",
                boxShadow: "0 2px 8px rgba(253,164,175,0.3)",
              }}
              animate={{
                scale: [1, 1.05, 1],
                transition: {
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                  delay: 0.6,
                },
              }}
            />
          </motion.div>
        </motion.div>
      </div>
      <p className="relative z-10 mt-4 text-sm font-medium text-muted-foreground">
        <span className="text-[#FDA4AF]">{omatase}</span> Omatase
      </p>
    </motion.div>
  );
}

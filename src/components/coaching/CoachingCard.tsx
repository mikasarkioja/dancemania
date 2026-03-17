"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/** From comparison-engine / Web Worker: score and worst joint group. */
export type ComparisonJointGroup = "Hips" | "Feet" | "Frame";

export interface ComparisonResult {
  harmonyScore: number;
  worstJointGroup: ComparisonJointGroup;
  timingOffsetMs?: number;
}

/** Metrics from ComparisonResult for Technical Stats. */
export interface TechnicalMetrics {
  tensionAvg: number;
  isolationAvg: number;
  placementAvg: number;
  alignedPairs: number;
}

/** One correction tip from ComparisonResult. */
export interface TechnicalCorrectionTip {
  message: string;
  count?: number;
  severity?: "low" | "medium" | "high";
}

/** Boutique-style coaching tips by worst joint group (from analysis engine). */
function getBoutiqueTipsForJointGroup(group: ComparisonJointGroup): string[] {
  switch (group) {
    case "Hips":
      return [
        "Your hip timing is slightly ahead of the beat—sink into the '2' for that classic Salsa look! ✨",
        "Let your pelvis lead the Cuban motion; keep the movement smooth and intentional.",
        "Match the teacher's hip pulse—think fluid, not forced.",
      ];
    case "Feet":
      return [
        "Focus on keeping your steps smaller during the faster sections to maintain your balance.",
        "Stay on the balls of your feet for quicker direction changes and cleaner weight transfer.",
        "Your footwork will shine when you match the teacher's step timing—don't rush the transitions.",
      ];
    case "Frame":
      return [
        "Your posture is the canvas—keep your frame soft but stable from shoulders to hands.",
        "Relax your shoulders back and let your arms follow your body; connection over tension.",
        "A little more frame stability will give you that polished, boutique look on the floor.",
      ];
    default:
      return [
        "Review the reference and try again—focus on one area at a time.",
        "Small adjustments in posture and timing add up to a cleaner performance.",
      ];
  }
}

export interface CoachingCardProps {
  /** Score 0–100 */
  score: number;
  /** AI-generated Pro Tips (used when comparisonResult is not provided) */
  proTips: string[];
  onRetry?: () => void;
  onNext?: () => void;
  /** Optional label for Next button, e.g. "Back to library" */
  nextLabel?: string;
  /** Optional: raw metrics for Technical Stats toggle (advanced students) */
  metrics?: TechnicalMetrics;
  /** Optional: correction tips from comparison for Technical Stats toggle */
  correctionTips?: TechnicalCorrectionTip[];
  /** Optional: real-time comparison result from analysis engine; drives boutique tips and accent. */
  comparisonResult?: ComparisonResult;
}

const bulletVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export function CoachingCard({
  score,
  proTips,
  onRetry,
  onNext,
  nextLabel = "Back to library",
  metrics,
  correctionTips = [],
  comparisonResult,
}: CoachingCardProps) {
  const [showTechnicalStats, setShowTechnicalStats] = useState(false);
  const displayScore = comparisonResult?.harmonyScore ?? score;
  const displayProTips =
    comparisonResult != null
      ? getBoutiqueTipsForJointGroup(comparisonResult.worstJointGroup)
      : proTips;

  const hasTechnicalStats =
    (metrics != null &&
      (metrics.tensionAvg !== undefined ||
        metrics.isolationAvg !== undefined ||
        metrics.placementAvg !== undefined ||
        metrics.alignedPairs !== undefined)) ||
    correctionTips.length > 0;

  const scoreColor =
    displayScore >= 80
      ? "text-[hsl(346,77%,50%)]"
      : displayScore >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  const accentTheme =
    displayScore >= 80
      ? "border-[hsl(346,77%,50%)]/30 bg-gradient-to-b from-card to-[hsl(346,77%,50%)]/10 shadow-[0_4px_24px_-4px_rgba(253,164,175,0.25)]"
      : displayScore >= 60
        ? "border-amber-500/20 bg-gradient-to-b from-card to-amber-500/5"
        : "border-brand-champagne/50 bg-gradient-to-b from-card to-muted/20";

  const iconAccent =
    displayScore >= 80
      ? "text-[hsl(346,77%,50%)]"
      : displayScore >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <Card className={`rounded-2xl overflow-hidden shadow-lg ${accentTheme}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className={`h-5 w-5 shrink-0 ${iconAccent}`} />
          <CardTitle className="font-serif text-xl text-foreground">
            Your feedback
          </CardTitle>
        </div>
        <p className="text-2xl font-bold tracking-tight mt-1">
          <span className={scoreColor}>{displayScore}%</span>
          <span className="text-muted-foreground text-base font-normal ml-2">
            match
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {correctionTips.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 font-serif text-sm font-medium text-primary">
              Dance-literate coaching
            </p>
            <ul className="space-y-2">
              {correctionTips.map((t, i) => (
                <motion.li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-foreground/95"
                  variants={bulletVariants}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <span className="shrink-0 font-medium text-primary">
                    {i + 1}.
                  </span>
                  <span>{t.message}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {displayProTips.length > 0 && (
          <div>
            <p className="mb-1.5 font-serif text-sm font-medium text-foreground/90">
              Pro tips
            </p>
            <ul className="space-y-2">
              {displayProTips.map((tip, i) => (
                <motion.li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-foreground/90"
                  variants={bulletVariants}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <span className={`shrink-0 font-medium ${iconAccent}`}>
                    {i + 1}.
                  </span>
                  <span>{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {hasTechnicalStats && (
          <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnicalStats((s) => !s)}
              className="flex min-h-[44px] w-full touch-manipulation items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <span>Technical stats</span>
              {showTechnicalStats ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>
            {showTechnicalStats && (
              <div className="border-t border-border/60 px-4 py-3 space-y-3 text-sm">
                {metrics != null && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground">
                    {metrics.tensionAvg !== undefined && (
                      <span>
                        Tension: {(metrics.tensionAvg * 100).toFixed(0)}%
                      </span>
                    )}
                    {metrics.isolationAvg !== undefined && (
                      <span>
                        Isolation: {(metrics.isolationAvg * 100).toFixed(0)}%
                      </span>
                    )}
                    {metrics.placementAvg !== undefined && (
                      <span>
                        Placement: {(metrics.placementAvg * 100).toFixed(0)}%
                      </span>
                    )}
                    {metrics.alignedPairs !== undefined && (
                      <span>Aligned pairs: {metrics.alignedPairs}</span>
                    )}
                  </div>
                )}
                {correctionTips.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground/90 mb-1.5">
                      Correction tips
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {correctionTips.map((t, i) => (
                        <li key={i}>
                          {t.message}
                          {t.severity != null && (
                            <span className="ml-1 text-xs">({t.severity})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={onRetry}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          {onNext && (
            <Button
              size="sm"
              className={
                displayScore >= 80
                  ? "rounded-full bg-[hsl(346,77%,50%)] text-white hover:opacity-90"
                  : "rounded-full bg-primary hover:bg-primary/90"
              }
              onClick={onNext}
            >
              {nextLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

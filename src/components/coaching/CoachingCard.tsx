"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

export interface CoachingCardProps {
  /** Score 0–100 */
  score: number;
  /** AI-generated Pro Tips */
  proTips: string[];
  onRetry?: () => void;
  onNext?: () => void;
  /** Optional label for Next button, e.g. "Back to library" */
  nextLabel?: string;
  /** Optional: raw metrics for Technical Stats toggle (advanced students) */
  metrics?: TechnicalMetrics;
  /** Optional: correction tips from comparison for Technical Stats toggle */
  correctionTips?: TechnicalCorrectionTip[];
}

export function CoachingCard({
  score,
  proTips,
  onRetry,
  onNext,
  nextLabel = "Back to library",
  metrics,
  correctionTips = [],
}: CoachingCardProps) {
  const [showTechnicalStats, setShowTechnicalStats] = useState(false);
  const hasTechnicalStats =
    (metrics != null &&
      (metrics.tensionAvg !== undefined ||
        metrics.isolationAvg !== undefined ||
        metrics.placementAvg !== undefined ||
        metrics.alignedPairs !== undefined)) ||
    correctionTips.length > 0;

  const scoreColor =
    score >= 80
      ? "text-primary"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-b from-card to-primary/5 shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <CardTitle className="font-serif text-xl text-foreground">
            Your feedback
          </CardTitle>
        </div>
        <p className="text-2xl font-bold tracking-tight mt-1">
          <span className={scoreColor}>{score}%</span>
          <span className="text-muted-foreground text-base font-normal ml-2">
            match
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {proTips.length > 0 && (
          <ul className="space-y-2">
            {proTips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-foreground/90 leading-relaxed"
              >
                <span className="text-primary font-medium shrink-0">
                  {i + 1}.
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {hasTechnicalStats && (
          <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnicalStats((s) => !s)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
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
              className="rounded-full bg-primary hover:bg-primary/90"
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

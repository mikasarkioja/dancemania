"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, ArrowRight } from "lucide-react";

export interface CoachingCardProps {
  /** Score 0–100 */
  score: number;
  /** AI-generated Pro Tips */
  proTips: string[];
  onRetry?: () => void;
  onNext?: () => void;
  /** Optional label for Next button, e.g. "Back to library" */
  nextLabel?: string;
}

export function CoachingCard({
  score,
  proTips,
  onRetry,
  onNext,
  nextLabel = "Back to library",
}: CoachingCardProps) {
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
                <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
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

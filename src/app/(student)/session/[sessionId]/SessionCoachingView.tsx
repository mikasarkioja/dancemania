"use client";

import { useRouter } from "next/navigation";
import { CoachingCard } from "@/components/coaching/CoachingCard";
import type { ComparisonJointGroup } from "@/features/practice/actions/session-actions";

export interface SessionCoachingViewProps {
  score: number;
  proTips: string[];
  worstJointGroup: ComparisonJointGroup | null;
}

export function SessionCoachingView({
  score,
  proTips,
  worstJointGroup,
}: SessionCoachingViewProps) {
  const router = useRouter();
  const comparisonResult =
    worstJointGroup != null
      ? ({ harmonyScore: score, worstJointGroup } as {
          harmonyScore: number;
          worstJointGroup: ComparisonJointGroup;
        })
      : undefined;

  return (
    <CoachingCard
      score={score}
      proTips={proTips}
      comparisonResult={comparisonResult}
      onNext={() => router.push("/dashboard")}
      nextLabel="Back to dashboard"
    />
  );
}

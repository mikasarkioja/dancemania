import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { SessionCoachingView } from "./SessionCoachingView";
import { getSessionCoachingFeedback } from "@/features/practice/actions/session-actions";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const feedback = await getSessionCoachingFeedback(sessionId);
  if (!feedback) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-svh bg-[#1a1a1c] pt-safe pb-safe">
      <div className="container mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#FDA4AF]/90 hover:text-[#FDA4AF]"
        >
          ← Back to dashboard
        </Link>
        <SessionCoachingView
          score={feedback.harmonyScore ?? 0}
          proTips={feedback.proTips}
          worstJointGroup={feedback.worstJointGroup ?? null}
        />
      </div>
    </main>
  );
}

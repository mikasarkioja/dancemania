import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isServerTeacherOrAdmin } from "@/lib/supabase/roles";
import { TeacherStudioUploadForm } from "@/features/teacher/components/TeacherStudioUploadForm";
import { TeacherRecentUploads } from "@/features/teacher/components/TeacherRecentUploads";

export default async function TeacherUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await isServerTeacherOrAdmin();
  if (!allowed) redirect("/dashboard");

  const { data: recent, error } = await supabase
    .from("dance_library")
    .select("id, title, status, created_at, updated_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return (
      <main className="min-h-svh bg-[#1a1a1c] px-4 py-8 text-destructive sm:px-6">
        Could not load uploads: {error.message}
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#1a1a1c] pb-safe pt-safe">
      <div className="container max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#FDA4AF]/90">
              Teacher studio
            </p>
            <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
              Contribute a move
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Upload privately, run Motion DNA extraction, verify AI labels,
              then submit for master admin approval.
            </p>
          </div>
          <Link
            href="/teacher"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10"
          >
            ← Insights
          </Link>
        </div>

        <div className="space-y-10">
          <TeacherStudioUploadForm />
          <TeacherRecentUploads userId={user.id} initialRows={recent ?? []} />
        </div>
      </div>
    </main>
  );
}

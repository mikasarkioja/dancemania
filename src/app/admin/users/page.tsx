import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isServerAdmin } from "@/lib/supabase/roles";
import { AdminUsersTable } from "@/features/admin/components/AdminUsersTable";

export default async function AdminUsersPage() {
  const ok = await isServerAdmin();
  if (!ok) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, updated_at")
    .order("updated_at", { ascending: false });

  const userIds = (profiles ?? []).map((p) => p.id);
  const sessionCounts: Record<string, number> = {};

  if (userIds.length > 0) {
    const { data: sessions } = await supabase
      .from("practice_sessions")
      .select("user_id");
    (sessions ?? []).forEach((s) => {
      sessionCounts[s.user_id] = (sessionCounts[s.user_id] ?? 0) + 1;
    });
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    email: p.email ?? null,
    role: (p.role as "student" | "teacher" | "admin") ?? "student",
    practice_count: sessionCounts[p.id] ?? 0,
  }));

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-accent"
        >
          ←
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            User management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage roles. Only admins can access this page.
          </p>
        </div>
      </div>
      <AdminUsersTable users={users} />
    </main>
  );
}

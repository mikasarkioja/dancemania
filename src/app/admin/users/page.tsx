import Link from "next/link";
import { redirect } from "next/navigation";
import { isServerAdmin } from "@/lib/supabase/roles";
import { AdminUserDirectory } from "@/features/admin/components/AdminUserDirectory";
import { fetchAdminDashboardData } from "@/features/admin/data/admin-dashboard";

export default async function AdminUsersPage() {
  const ok = await isServerAdmin();
  if (!ok) {
    redirect("/dashboard");
  }

  const { directoryUsers } = await fetchAdminDashboardData();

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-[#1a1a1c] text-white">
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/admin"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            ←
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white">
              User management
            </h1>
            <p className="text-sm text-white/55">
              Same directory as the studio overview. Only admins can access this
              page.
            </p>
          </div>
        </div>
        <AdminUserDirectory users={directoryUsers} />
      </main>
    </div>
  );
}

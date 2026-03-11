import Link from "next/link";
import { AdminUpload } from "@/features/admin";

export default function AdminPage() {
  return (
    <main className="container py-8">
      <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
      <p className="mb-6 text-muted-foreground">
        Upload and label teacher videos to the dance library.
      </p>
      <nav className="mb-6 flex flex-wrap gap-4">
        <Link
          href="/admin/label"
          className="text-sm text-primary underline hover:no-underline"
        >
          Label videos (move segments & instructions) →
        </Link>
        <Link
          href="/admin/dictionary"
          className="text-sm text-primary underline hover:no-underline"
        >
          Biomechanical dictionary (Lab) →
        </Link>
      </nav>
      <AdminUpload />
    </main>
  );
}

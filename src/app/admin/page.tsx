import Link from "next/link";
import { AdminUpload } from "@/features/admin";

export default function AdminPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Admin</h1>
      <p className="text-muted-foreground mt-1 mb-8">
        Upload and label teacher videos to the dance library.
      </p>
      <nav className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/admin/label"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Label videos →
        </Link>
        <Link
          href="/admin/dictionary"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Biomechanical dictionary (Lab) →
        </Link>
      </nav>
      <AdminUpload />
    </main>
  );
}

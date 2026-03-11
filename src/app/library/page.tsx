import Link from "next/link";
import { StudentLibraryView } from "@/features/library/components/StudentLibraryView";

export default function LibraryPage() {
  return (
    <main className="container py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Discover moves</h1>
          <p className="text-muted-foreground">
            Browse published videos. Search by move name or filter by role and
            difficulty.
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm text-primary underline">
          ← Home
        </Link>
      </div>
      <StudentLibraryView />
    </main>
  );
}

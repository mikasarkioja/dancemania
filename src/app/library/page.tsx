import Link from "next/link";
import { StudentLibraryView } from "@/features/library/components/StudentLibraryView";

export default function LibraryPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Discover moves</h1>
          <p className="text-muted-foreground mt-1">
            Browse published videos. Search by move name or filter by role and difficulty.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          ← Home
        </Link>
      </div>
      <StudentLibraryView />
    </main>
  );
}

import Link from "next/link";

export default function PracticePage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Practice</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Pick a teacher video from the library, then practice with webcam capture and analysis. You’ll get a comparison score and AI coaching tips after each attempt.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/library"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Browse library to practice →
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          ← Home
        </Link>
      </div>
    </main>
  );
}

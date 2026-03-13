import Link from "next/link";

export default function PracticePage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Practice</h1>
      <p className="text-muted-foreground mt-1 mb-8">
        Webcam capture and analysis (student flow).
      </p>
      <Link
        href="/"
        className="inline-block rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        ← Home
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">DanceAI</h1>
      <p className="mb-8 text-muted-foreground">
        Salsa & Bachata posture and rhythm analysis
      </p>
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link
          href="/library"
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          Library
        </Link>
        <Link
          href="/encyclopedia"
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          Encyclopedia
        </Link>
        <Link
          href="/practice"
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          Practice
        </Link>
        <Link
          href="/admin"
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          Admin
        </Link>
      </nav>
    </main>
  );
}

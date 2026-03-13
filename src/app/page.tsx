import Link from "next/link";
import { AnimatedCard } from "@/components/ui/card";
import { DancingCoach } from "@/components/animations/DancingCoach";

export default function Home() {
  return (
    <main className="container mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="grid gap-8 sm:grid-cols-[1fr,auto] sm:items-start">
        <AnimatedCard className="rounded-3xl border-border/50 bg-card shadow-lg shadow-primary/5 p-8 sm:p-10">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            DanceAI
          </h1>
          <p className="text-muted-foreground text-lg mb-10 max-w-lg">
            Salsa & Bachata posture and rhythm analysis. Refine your frame, timing,
            and movement with guided practice.
          </p>
          <nav className="flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              See demo
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Library
            </Link>
            <Link
              href="/encyclopedia"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Encyclopedia
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Practice
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Admin
            </Link>
          </nav>
        </AnimatedCard>
        <AnimatedCard delay={0.1} className="rounded-3xl border-border/50 bg-brand-champagne/30 p-6 flex items-center justify-center min-h-[180px]">
          <DancingCoach className="w-32 h-32" />
        </AnimatedCard>
      </div>
    </main>
  );
}

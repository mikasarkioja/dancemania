import Link from "next/link";

/**
 * Placeholder for Founding Member / purchase flow.
 * Point NEXT_PUBLIC_PURCHASE_URL or NEXT_PUBLIC_FOUNDING_MEMBER_URL to your checkout when ready.
 */
export default function PricingPage() {
  return (
    <main className="min-h-[100svh] bg-brand-champagne/50 flex flex-col items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Founding Member Access
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Personalized Mastery Path, unlimited AI coaching, and exclusive
          Masterclass Move Packs are coming soon.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Set{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            NEXT_PUBLIC_PURCHASE_URL
          </code>{" "}
          or{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            NEXT_PUBLIC_FOUNDING_MEMBER_URL
          </code>{" "}
          to point to your checkout.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-brand-rose px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

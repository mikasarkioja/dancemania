import Link from "next/link";

/**
 * Privacy Policy placeholder. Replace with your full policy.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-[100svh] bg-brand-champagne/50 px-4 py-12 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Face data is never stored, and motion data is yours to control. We use
          pose (joint) data only to power your practice feedback and never sell
          your information.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          For full terms and data practices, replace this page with your
          complete Privacy Policy.
        </p>
        <Link
          href="/settings"
          className="mt-8 inline-block text-sm font-medium text-primary underline underline-offset-2"
        >
          ← Back to Settings
        </Link>
      </div>
    </main>
  );
}

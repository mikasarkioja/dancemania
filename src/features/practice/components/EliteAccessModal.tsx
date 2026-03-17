"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAnalyticsEvent } from "../actions/usage-actions";

const FOUNDING_ACCESS_URL =
  process.env.NEXT_PUBLIC_PURCHASE_URL ||
  process.env.NEXT_PUBLIC_FOUNDING_MEMBER_URL ||
  "/pricing";

/**
 * Elite Access Required modal: shown when user has used 3 free practices.
 * Glassmorphism, Rose Gold accents, backdrop blur. Tracks "Upsell Click" for intent.
 */
export interface EliteAccessModalProps {
  onDismiss?: () => void;
}

export function EliteAccessModal({ onDismiss }: EliteAccessModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRequestAccess = async () => {
    setLoading(true);
    await logAnalyticsEvent("Upsell Click", { source: "elite_access_modal" });
    setLoading(false);
    if (FOUNDING_ACCESS_URL.startsWith("/")) {
      router.push(FOUNDING_ACCESS_URL);
    } else {
      window.location.href = FOUNDING_ACCESS_URL;
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-md"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="elite-access-title"
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-xl"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-rose/20">
            <Sparkles className="h-6 w-6 text-brand-rose" />
          </div>
          <h2
            id="elite-access-title"
            className="font-serif text-xl font-bold text-foreground"
          >
            Elite Access Required
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          You&apos;ve reached the limit of the Digital Mirror. ✨
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          As a boutique studio, we limit practice sessions to maintain elite
          processing speeds. Join our Founding Member waitlist to unlock
          unlimited AI coaching and 3D Motion DNA analysis.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            className="w-full rounded-full bg-brand-rose px-6 py-3 text-white shadow-[0_0_20px_rgba(253,164,175,0.5)] hover:bg-brand-rose/90 hover:shadow-[0_0_24px_rgba(253,164,175,0.6)]"
            onClick={handleRequestAccess}
            disabled={loading}
          >
            {loading ? "Taking you there…" : "Request Founding Access"}
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              className="w-full rounded-full text-muted-foreground"
              onClick={onDismiss}
              disabled={loading}
            >
              Maybe later
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

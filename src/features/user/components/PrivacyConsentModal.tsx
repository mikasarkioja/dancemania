"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrivacyConsentModalProps {
  onAccept: () => void;
  loading?: boolean;
}

/**
 * Sleek Rose Gold consent modal. Explains how data is used and that faces are never stored.
 */
export function PrivacyConsentModal({
  onAccept,
  loading = false,
}: PrivacyConsentModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-gray-900/95"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-rose/20">
            <Sparkles className="h-6 w-6 text-brand-rose" />
          </div>
          <h2
            id="privacy-consent-title"
            className="font-serif text-xl font-bold text-foreground"
          >
            Your privacy matters
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          To give you movement feedback, we use your camera to capture pose data
          (joint positions—shoulders, hips, knees, etc.). We never store your
          face: facial landmarks are never saved. Your data stays in your
          account and is used only to power your practice and coaching.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          By continuing, you allow us to process pose data for this session and
          to save anonymized movement data to your account so you can see your
          progress.
        </p>
        <Button
          className="mt-6 w-full rounded-full bg-brand-rose px-6 py-3 text-white hover:opacity-90"
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "Accepting…" : "I understand, continue"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

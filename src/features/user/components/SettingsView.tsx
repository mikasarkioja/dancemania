"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  deleteUserBiometricData,
  exportUserData,
} from "../actions/privacy-actions";
import { toast } from "sonner";

const PRIVACY_POLICY_PATH = "/privacy";

export function SettingsView() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDeleteClick = () => {
    setConfirmStep(1);
    setConfirmOpen(true);
  };

  const handleConfirmStep1 = () => {
    setConfirmStep(2);
  };

  const handleConfirmStep2 = async () => {
    setDeleting(true);
    try {
      const result = await deleteUserBiometricData();
      if (result.success) {
        setConfirmOpen(false);
        toast.success(
          "Your data has been gracefully erased from the studio. We hope to see you on the floor again soon. ✨"
        );
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        return;
      }
      toast.error(result.error ?? "Deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportUserData();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dance-studio-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Your data export has been downloaded.");
      } else {
        toast.error(result.error ?? "Export failed.");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/50 bg-white/60 text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
      </div>

      <section className="rounded-2xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur-md">
        <p className="font-serif text-lg text-foreground">
          Your privacy is our choreography&apos;s foundation. ✨
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Here you can manage your data and account. We never sell your
          information and only use pose data to power your practice feedback.
        </p>
      </section>

      <section className="rounded-2xl border border-red-200/60 bg-red-50/30 p-6 shadow-sm backdrop-blur-md dark:border-red-900/40 dark:bg-red-950/20">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          Danger Zone
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Permanently delete all your practice sessions and any videos you
          uploaded. This cannot be undone.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Face data is never stored, and motion data is yours to control.{" "}
          <Link
            href={PRIVACY_POLICY_PATH}
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] touch-manipulation border-muted-foreground/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Preparing…" : "Request my data export"}
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] touch-manipulation border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
            onClick={handleDeleteClick}
          >
            Delete my account & biometric data
          </Button>
        </div>
      </section>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() =>
              !deleting && (setConfirmOpen(false), setConfirmStep(1))
            }
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-hidden
            />
            <motion.dialog
              open
              className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-gray-900/95"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {confirmStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Delete all my data?
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground">
                      This will permanently erase your 3D Motion DNA and
                      practice history. This action cannot be undone.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setConfirmOpen(false);
                          setConfirmStep(1);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-amber-500/50 text-amber-700 dark:text-amber-400"
                        onClick={handleConfirmStep1}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}
                {confirmStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Final confirmation
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Your practice sessions and uploaded videos will be
                      permanently deleted. You will be signed out and returned
                      to the home page.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={deleting}
                        onClick={() => setConfirmStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={deleting}
                        onClick={handleConfirmStep2}
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Permanently delete"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

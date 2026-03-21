"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert } from "lucide-react";

type InspectPayload = {
  sentinelReport?: {
    metadataChecksPass?: boolean;
    flagMismatches?: string[];
    summary?: { supabaseAuthCookieCount?: number };
  };
};

export function SentinelHealthWidget() {
  const [state, setState] = useState<
    "loading" | "healthy" | "warning" | "error"
  >("loading");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/inspect-cookies", {
          cache: "no-store",
        });
        const json = (await res.json()) as InspectPayload;
        if (cancelled) return;
        const pass = json.sentinelReport?.metadataChecksPass === true;
        const mismatches = json.sentinelReport?.flagMismatches ?? [];
        if (pass) {
          setState("healthy");
          setDetail("Auth cookies present and non-empty.");
        } else {
          setState("warning");
          setDetail(
            mismatches[0] ??
              "Review cookie metadata or sign in again to validate session."
          );
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setDetail("Could not reach diagnostic endpoint.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const healthy = state === "healthy";

  return (
    <section
      id="sentinel"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.85)] p-5 backdrop-blur-xl"
      aria-labelledby="sentinel-heading"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
            healthy
              ? "bg-emerald-500/20 text-emerald-400"
              : state === "loading"
                ? "bg-white/10 text-white/50"
                : "bg-[#FDA4AF]/20 text-[#FDA4AF]"
          }`}
        >
          {healthy ? (
            <motion.span
              className="absolute inset-2 rounded-xl bg-emerald-400/30"
              animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.05, 1] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ) : null}
          {healthy ? (
            <ShieldCheck className="relative z-10 h-7 w-7" />
          ) : (
            <ShieldAlert className="relative z-10 h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="sentinel-heading"
            className="font-serif text-lg font-semibold text-white"
          >
            System integrity
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Sentinel cookie diagnostic (same as{" "}
            <code className="rounded bg-black/30 px-1 text-xs">
              /api/auth/inspect-cookies
            </code>
            ).
          </p>
          <p
            className={`mt-2 text-sm font-medium ${
              healthy ? "text-emerald-400" : "text-[#FDA4AF]"
            }`}
          >
            {state === "loading" && "Checking session metadata…"}
            {state === "healthy" && "Green light — middleware auth cookies OK."}
            {(state === "warning" || state === "error") && detail}
          </p>
        </div>
      </div>
    </section>
  );
}

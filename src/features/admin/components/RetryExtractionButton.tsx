"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export interface RetryExtractionButtonProps {
  videoId: string;
  className?: string;
}

/**
 * Re-runs POST /api/process-dance-video for a library row (admin/teacher only).
 */
export function RetryExtractionButton({
  videoId,
  className,
}: RetryExtractionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function retry() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/process-dance-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId: videoId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: "err",
          text: data.error ?? `Request failed (${res.status})`,
        });
        return;
      }
      setMessage({
        type: "ok",
        text: "Extraction finished — refreshing.",
      });
      router.refresh();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2"
        disabled={loading}
        onClick={() => void retry()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Retry extraction
      </Button>
      {message && (
        <p
          className={
            message.type === "ok"
              ? "mt-2 text-xs text-emerald-700 dark:text-emerald-300"
              : "mt-2 text-xs text-destructive"
          }
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

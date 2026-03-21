"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead } from "@/features/notifications/actions/notification-actions";
import type { NotificationRow } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function mapRow(raw: Record<string, unknown>): NotificationRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    type: raw.type as NotificationRow["type"],
    title: String(raw.title ?? ""),
    message: String(raw.message ?? ""),
    link: raw.link != null ? String(raw.link) : null,
    is_read: Boolean(raw.is_read),
    created_at: String(raw.created_at ?? ""),
  };
}

export function NotificationBell({ className }: { className?: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;
      if (error) {
        console.warn("[NotificationBell] fetch", error.message);
        return;
      }
      setItems((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    })();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const n = mapRow(payload.new as Record<string, unknown>);
          toast(n.title, {
            description: n.message,
            duration: 6000,
          });
          setIsPulsing(true);
          window.setTimeout(() => setIsPulsing(false), 700);
          setItems((prev) =>
            [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 5)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const n = mapRow(payload.new as Record<string, unknown>);
          setItems((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, ...n } : x))
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true);
    const res = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not mark all read.");
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All caught up.");
  }, []);

  if (!userId) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <motion.span
          className="inline-flex"
          animate={
            isPulsing
              ? {
                  scale: [1, 1.12, 1],
                  filter: [
                    "drop-shadow(0 0 0 rgba(253,164,175,0))",
                    "drop-shadow(0 0 10px rgba(253,164,175,0.75))",
                    "drop-shadow(0 0 0 rgba(253,164,175,0))",
                  ],
                }
              : { scale: 1, filter: "none" }
          }
          transition={{ duration: 0.65, ease: "easeInOut" }}
        >
          <Bell className="h-5 w-5" />
        </motion.span>
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[#FDA4AF] ring-2 ring-background" />
        ) : null}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl border border-[#FDA4AF]/25 bg-background/75 shadow-xl backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-serif text-sm font-semibold text-foreground">
              Studio pulse
            </p>
            <p className="text-[11px] text-muted-foreground">
              Approvals, milestones, and system notes
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-white/5 last:border-0",
                    !n.is_read && "bg-[#FDA4AF]/[0.06]"
                  )}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block px-4 py-3 text-left transition-colors hover:bg-accent/40"
                      onClick={() => setOpen(false)}
                    >
                      <NotificationItemBody n={n} />
                    </Link>
                  ) : (
                    <div className="px-4 py-3">
                      <NotificationItemBody n={n} />
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
          {items.length > 0 && unreadCount > 0 ? (
            <div className="border-t border-white/10 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-full gap-2 text-xs text-[#FDA4AF] hover:bg-[#FDA4AF]/10 hover:text-[#FDA4AF]"
                disabled={markingAll}
                onClick={() => void handleMarkAll()}
              >
                {markingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark all as read
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function NotificationItemBody({ n }: { n: NotificationRow }) {
  return (
    <>
      <p className="text-xs font-semibold text-foreground">{n.title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {n.message}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {n.type.replace(/_/g, " ")}
      </p>
    </>
  );
}

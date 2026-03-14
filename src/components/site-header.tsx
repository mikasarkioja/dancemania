"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAppGenre } from "@/contexts/GenreContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/demo", label: "Demo" },
  { href: "/library", label: "Library" },
  { href: "/encyclopedia", label: "Encyclopedia" },
  { href: "/practice", label: "Practice" },
  { href: "/admin", label: "Admin" },
] as const;

const linkClass =
  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors block md:inline-block min-h-[44px] flex items-center";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { genre, setGenre } = useAppGenre();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
    >
      <div className="container flex h-14 max-w-4xl mx-auto items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors min-h-[44px] items-center shrink-0"
        >
          <Logo size={28} />
          <span className="hidden sm:inline">DanceAI</span>
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setGenre("salsa")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[36px]",
              genre === "salsa"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Salsa
          </button>
          <button
            type="button"
            onClick={() => setGenre("bachata")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[36px]",
              genre === "bachata"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Bachata
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground touch-manipulation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[280px] flex-col border-l border-border/40 bg-background shadow-xl md:hidden"
            style={{
              paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
              paddingBottom: "env(safe-area-inset-bottom, 0)",
            }}
          >
            <div className="flex h-14 items-center justify-between px-4">
              <span className="font-semibold text-foreground">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground touch-manipulation"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-2">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const navLinks = [
  { href: "/library", label: "Library" },
  { href: "/encyclopedia", label: "Encyclopedia" },
  { href: "/practice", label: "Practice" },
  { href: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 max-w-4xl mx-auto items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Logo size={28} />
          <span>DanceAI</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

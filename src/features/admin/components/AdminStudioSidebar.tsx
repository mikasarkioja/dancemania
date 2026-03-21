"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Library,
  FlaskConical,
  Activity,
  Tag,
  BookOpen,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Studio overview", icon: LayoutDashboard },
  { href: "/admin#directory", label: "User directory", icon: Users },
  { href: "/admin/label", label: "Label queue", icon: Tag },
  { href: "/admin/dictionary", label: "Dictionary lab", icon: FlaskConical },
  { href: "/encyclopedia", label: "Move registry", icon: BookOpen },
  { href: "/admin#sentinel", label: "Diagnostic audit", icon: Activity },
] as const;

export function AdminStudioSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-56 shrink-0 border-r border-white/10 bg-[rgba(22,22,24,0.95)] backdrop-blur-xl lg:block"
      aria-label="Admin navigation"
    >
      <div className="sticky top-0 flex flex-col gap-1 p-4 pt-8">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FDA4AF]/80">
          sentri.fi studio
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const isOverview = href === "/admin";
          const active =
            isOverview && pathname === "/admin" && !href.includes("#");
          const isHash = href.includes("#");
          return (
            <Link
              key={href + label}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#FDA4AF]/15 text-[#FDA4AF]"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
                isHash && "text-white/80"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {label}
            </Link>
          );
        })}
        <Link
          href="/library"
          className="mt-4 border-t border-white/10 pt-4 text-xs text-white/45 hover:text-[#FDA4AF]"
        >
          ← Public library
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
      {links.slice(0, 4).map(({ href, label }) => (
        <Link
          key={href + label}
          href={href}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

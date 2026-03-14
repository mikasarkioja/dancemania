"use client";

import { GenreProvider } from "@/contexts/GenreContext";
import { SplashWrapper } from "@/components/brand/SplashWrapper";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GenreProvider>
      <SplashWrapper>
        <SiteHeader />
        {children}
      </SplashWrapper>
    </GenreProvider>
  );
}

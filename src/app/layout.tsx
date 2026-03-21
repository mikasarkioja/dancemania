import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { BoutiqueToaster } from "@/components/BoutiqueToaster";

export const metadata: Metadata = {
  title: "DanceAI",
  description: "Salsa & Bachata posture and rhythm analysis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FDF2F8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
        <BoutiqueToaster />
      </body>
    </html>
  );
}

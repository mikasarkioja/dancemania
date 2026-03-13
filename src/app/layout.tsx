import type { Metadata } from "next";
import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "DanceAI",
  description: "Salsa & Bachata posture and rhythm analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

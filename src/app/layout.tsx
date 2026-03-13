import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}

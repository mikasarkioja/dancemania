"use client";

import { Toaster } from "sonner";

/**
 * Boutique Sonner: glass surface, rose-gold hairline border, refined type.
 */
export function BoutiqueToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast border border-[#FDA4AF]/35 bg-background/80 backdrop-blur-xl shadow-lg " +
            "text-foreground font-sans antialiased",
          title: "font-semibold tracking-tight text-foreground font-serif",
          description: "text-muted-foreground text-sm leading-snug",
          actionButton:
            "bg-[#FDA4AF]/20 text-foreground border border-[#FDA4AF]/30",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton:
            "text-muted-foreground hover:text-foreground border-0 bg-transparent",
          success:
            "border-[#FDA4AF]/40 bg-background/85 [&_[data-icon]]:text-[#FDA4AF]",
          error: "border-destructive/35 bg-background/85",
          warning: "border-amber-500/30 bg-background/85",
          info: "border-[#FDA4AF]/25 bg-background/85",
        },
      }}
    />
  );
}

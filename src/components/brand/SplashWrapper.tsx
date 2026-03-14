"use client";

import { useState, useEffect } from "react";
import { SplashScreen } from "./SplashScreen";

/**
 * Wraps the app and shows the Boutique Splash until initial load is ready.
 * Use in root layout so test users see the branded splash on first paint.
 */
export function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <SplashScreen isReady={isReady} status="preparing your studio...">
      {children}
    </SplashScreen>
  );
}

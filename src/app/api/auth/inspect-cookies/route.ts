import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";

export const dynamic = "force-dynamic";

interface CookieMeta {
  name: string;
  present: boolean;
  valueLength: number;
  isSupabaseAuth: boolean;
}

/**
 * Sentinel Cookie Integrity Diagnostic (temporary).
 * Returns metadata only: cookie names, presence, length. Never exposes JWT or secret values.
 * Security flags (Secure, HttpOnly, SameSite) cannot be read from the request;
 * verify those in browser DevTools > Application > Cookies.
 */
export async function GET() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const list: CookieMeta[] = all.map(({ name, value }) => ({
    name,
    present: true,
    valueLength: typeof value === "string" ? value.length : 0,
    isSupabaseAuth: name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX),
  }));

  const supabaseAuthCookies = list.filter((c) => c.isSupabaseAuth);
  const hasAuthCookie = supabaseAuthCookies.length > 0;
  const allHaveLength = supabaseAuthCookies.every((c) => c.valueLength > 0);

  const sentinelReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCookies: list.length,
      supabaseAuthCookieCount: supabaseAuthCookies.length,
      supabaseAuthCookieNames: supabaseAuthCookies.map((c) => c.name),
      authCookiesPresent: hasAuthCookie,
      authCookiesNonEmpty: allHaveLength,
    },
    /** true only when sb-* cookies are present and non-empty; flags must still be verified in DevTools. */
    metadataChecksPass: hasAuthCookie && allHaveLength,
    securityFlagsNote:
      "Secure, HttpOnly, SameSite and Partitioned cannot be read from the request (browser does not send them). Verify in DevTools > Application > Cookies.",
    expectedFlags: {
      Secure: "Must be true in production (HTTPS only).",
      HttpOnly:
        "Should be true to reduce XSS token theft risk (Supabase SSR may set per cookie options).",
      SameSite:
        "Should be Lax or Strict to reduce CSRF; avoid None unless cross-site is required.",
      Partitioned:
        "Optional; set if you expect cross-site or embedded (e.g. Safari ITP). First-party cookie proxy may be needed.",
    },
    flagMismatches: [] as string[],
    recommendations: [] as string[],
  };

  if (!hasAuthCookie) {
    sentinelReport.flagMismatches.push(
      "No Supabase auth cookies present (user may be signed out or callback not yet completed)."
    );
  } else if (!allHaveLength) {
    sentinelReport.flagMismatches.push(
      "One or more Supabase auth cookies have empty value."
    );
  }

  if (supabaseAuthCookies.length > 0) {
    sentinelReport.recommendations.push(
      "In browser DevTools > Application > Cookies, confirm each sb-* cookie has Secure=true (production), HttpOnly=true, SameSite=Lax or Strict."
    );
  }

  sentinelReport.recommendations.push(
    "If you expect cross-site or embedded (e.g. iframes, Safari), verify Partitioned (CHIPS) in DevTools; consider a first-party cookie proxy if sb-* cookies are blocked."
  );

  const response = {
    cookies: list,
    sentinelReport,
  };

  console.info("[Sentinel] Cookie integrity check", {
    at: sentinelReport.timestamp,
    totalCookies: list.length,
    sbAuthCount: supabaseAuthCookies.length,
    sbAuthNames: sentinelReport.summary.supabaseAuthCookieNames,
    mismatches: sentinelReport.flagMismatches.length,
    mismatchDetails:
      sentinelReport.flagMismatches.length > 0
        ? sentinelReport.flagMismatches
        : undefined,
  });

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Sentinel-Diagnostic":
        "Cookie metadata only; no JWT or secrets exposed.",
    },
  });
}

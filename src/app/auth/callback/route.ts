import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_SUCCESS_PATH = "/dashboard";
const AUTH_ERROR_PATH = "/auth/auth-error";

function isSafeRedirectPath(next: string): boolean {
  const s = next.trim();
  if (s === "" || !s.startsWith("/")) return false;
  if (s.startsWith("//")) return false;
  if (s.includes("\\")) return false;
  return true;
}

function safeRedirectDestination(rawNext: string | null): string {
  const next = rawNext?.trim() ?? "";
  return isSafeRedirectPath(next) ? next : DEFAULT_SUCCESS_PATH;
}

function buildErrorRedirect(origin: string, message: string): NextResponse {
  const params = new URLSearchParams({ message });
  return NextResponse.redirect(
    `${origin}${AUTH_ERROR_PATH}?${params.toString()}`
  );
}

/**
 * Supabase Auth callback: PKCE code exchange and redirect.
 * - Extracts code and next from URL; uses createClient (async, await cookies()).
 * - If session already exists (double-callback quirk), redirects to next without re-exchange.
 * - On success: redirect to validated next or /dashboard; server log (no sensitive data).
 * - On failure: redirect to /auth/auth-error with descriptive message.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = safeRedirectDestination(rawNext);

  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (!code) {
    return buildErrorRedirect(
      origin,
      "No authorization code received. The sign-in link may have expired or been used already."
    );
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return buildErrorRedirect(
      origin,
      error.message ?? "Session exchange failed. Please try signing in again."
    );
  }

  console.info("[auth/callback] Sign-in success", {
    at: new Date().toISOString(),
  });

  // Cookie commit: Supabase setAll() wrote session cookies via cookieStore.set().
  // Next.js merges those into the response we return; redirect must be the only return path so Set-Cookie is sent.
  return NextResponse.redirect(`${origin}${next}`);
}

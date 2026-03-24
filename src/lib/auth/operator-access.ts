import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const OPERATOR_COOKIE_NAME = "operator_tools_access";
const OPERATOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function getConfiguredPassword(): string {
  return (process.env.ADMIN_TOOLS_PASSWORD ?? "").trim();
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function expectedCookieValueFromPassword(password: string): string {
  return sha256(`operator-gate:${password}`);
}

export function isOperatorPasswordEnabled(): boolean {
  return getConfiguredPassword().length > 0;
}

export async function hasOperatorPasswordAccess(): Promise<boolean> {
  const configured = getConfiguredPassword();
  if (!configured) return false;

  const store = await cookies();
  const raw = store.get(OPERATOR_COOKIE_NAME)?.value ?? "";
  const expected = expectedCookieValueFromPassword(configured);
  return safeEqualHex(raw, expected);
}

export async function grantOperatorPasswordAccess(): Promise<void> {
  const configured = getConfiguredPassword();
  if (!configured) return;

  const store = await cookies();
  store.set(OPERATOR_COOKIE_NAME, expectedCookieValueFromPassword(configured), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OPERATOR_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearOperatorPasswordAccess(): Promise<void> {
  const store = await cookies();
  store.delete(OPERATOR_COOKIE_NAME);
}

export function isOperatorPasswordValid(candidate: string): boolean {
  const configured = getConfiguredPassword();
  if (!configured) return false;
  return safeEqualHex(sha256(candidate), sha256(configured));
}

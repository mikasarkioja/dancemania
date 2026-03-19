/**
 * Auth feature: Email OTP login, sign out.
 * Uses Supabase SSR + Next.js 15 (async createClient).
 */

export {
  sendLoginOtp,
  verifyLoginOtp,
  signOut,
  type SendLoginOtpResult,
  type VerifyLoginOtpResult,
} from "./actions/auth-actions";

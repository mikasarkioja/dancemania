/**
 * Length of the email OTP the login UI expects (must match Supabase Auth).
 *
 * - **Local Supabase:** set the same value in `supabase/config.toml` under
 *   `[auth.email]` → `otp_length` (default in CLI template is `6`).
 * - **Hosted Supabase:** length is controlled by your project’s Auth config
 *   (see `docs/SUPABASE_EMAIL_OTP_SETUP.md`). If emails show a different
 *   length, change this constant to match.
 */
export const LOGIN_EMAIL_OTP_LENGTH = 6;

# Supabase email OTP for DanceAI login

The login page uses **`verifyOtp({ email, token, type: 'email' })`**. The number of input boxes and the copy (“N-digit code”) come from **`LOGIN_EMAIL_OTP_LENGTH`** in **`src/lib/auth/otp-config.ts`** (default **6**). That value **must match** the OTP length your Supabase project actually sends.

Supabase only includes the numeric code in the email if your template uses **`{{ .Token }}`**.

## Use 6-digit codes (recommended)

### 1. This app (`otp-config.ts`)

In **`src/lib/auth/otp-config.ts`** set:

```ts
export const LOGIN_EMAIL_OTP_LENGTH = 6;
```

(That is already the default in this repo.)

### 2. Local Supabase (`supabase start`)

In **`supabase/config.toml`**, under **`[auth.email]`**, set:

```toml
[auth.email]
otp_length = 6
# optional: otp_expiry = 3600
```

Then restart: `supabase stop && supabase start`.

The [official CLI template](https://github.com/supabase/cli/blob/develop/pkg/config/templates/config.toml) defaults `otp_length = 6` for `[auth.email]`.

### 3. Hosted Supabase (supabase.co)

Hosted projects use the Auth service settings Supabase assigns to your project. The dashboard does **not** always expose `otp_length` in the UI; if your emails still show **8** digits while the app expects **6**, you have two options:

- **A)** Set **`LOGIN_EMAIL_OTP_LENGTH = 8`** in `otp-config.ts` so the UI matches what Supabase sends, **or**
- **B)** Ask **Supabase support** whether your project’s email OTP length can be set to 6, or check **Project Settings → Authentication** (and provider email sections) on newer dashboards for an OTP / mailer length control.

Until hosted length and app length match, verification will fail or users will be confused.

If the template only uses **`{{ .ConfirmationURL }}`**, users receive a **magic link only** — no OTP. That matches the default Supabase “Magic link” template.

## Fix (hosted Supabase)

1. Open **[Authentication → Email Templates](https://supabase.com/dashboard/project/_/auth/templates)**.
2. Edit **Magic link** (used for passwordless `signInWithOtp` on existing users).
3. Replace the body with a template that **shows the code prominently**, e.g. copy from [`../supabase/templates/magic_link.html`](../supabase/templates/magic_link.html) in this repo.
4. If **Confirm signup** is used (email confirmations enabled for new users), edit **Confirm signup** the same way so new accounts also receive `{{ .Token }}`. Use [`../supabase/templates/confirm_signup.html`](../supabase/templates/confirm_signup.html) as a starting point.
5. **Do not** set `emailRedirectTo` in `sendLoginOtp` (this app already omits it). Passing `emailRedirectTo` is for magic-link redirects and is not used for the OTP-only UI.

### Subject line suggestion

- Magic link: `Your DanceAI sign-in code`
- Confirm signup: `Confirm your email — your code`

## Optional: magic link + code in one email

You can include **both** `{{ .Token }}` and `{{ .ConfirmationURL }}` in the same template so users can either enter the code on `/login` or click the link.

## Local Supabase (`supabase start`)

1. Add to `supabase/config.toml`:

```toml
[auth.email.template.magic_link]
subject = "Your DanceAI sign-in code"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.confirmation]
subject = "Confirm your DanceAI email"
content_path = "./supabase/templates/confirm_signup.html"
```

2. Restart: `supabase stop && supabase start`

(Include the `confirmation` block only if you use email confirmation on signup.)

## References

- [Supabase `signInWithOtp`](https://supabase.com/docs/reference/javascript/auth-signinwithotp) — OTP vs link is determined by template variables.
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)

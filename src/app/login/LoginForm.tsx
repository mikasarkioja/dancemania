"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { sendLoginOtp, verifyLoginOtp } from "@/features/auth";
import { LOGIN_EMAIL_OTP_LENGTH } from "@/lib/auth/otp-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OTP_LENGTH = LOGIN_EMAIL_OTP_LENGTH;
const RESEND_COOLDOWN_SEC = 60;

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const slotRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setCodeDigit = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      slotRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleCodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        slotRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    setCode((prev) => {
      const next = [...prev];
      pasted.split("").forEach((char, i) => {
        next[i] = char;
      });
      return next;
    });
    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    slotRefs.current[nextFocus]?.focus();
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSendLoading(true);
    setStatus(null);
    const result = await sendLoginOtp(email);
    setSendLoading(false);
    if (result.ok) {
      setStep("code");
      setCode(Array(OTP_LENGTH).fill(""));
      setStatus({ type: "success", message: result.message });
      setResendCooldown(RESEND_COOLDOWN_SEC);
      const interval = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(interval);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      slotRefs.current[0]?.focus();
    } else {
      const isRateLimit = /wait|rate|limit|moment/i.test(result.error) ?? false;
      setStatus({
        type: "error",
        message: isRateLimit
          ? "Please wait a moment before requesting a new code."
          : result.error,
      });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join("");
    if (token.length !== OTP_LENGTH) return;
    setVerifyLoading(true);
    setStatus(null);
    const result = await verifyLoginOtp(email, token);
    setVerifyLoading(false);
    if (result.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setStatus({
        type: "error",
        message:
          result.error ===
          "The sentinel could not verify this code. Please try again."
            ? result.error
            : result.error,
      });
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setStatus(null);
    setSendLoading(true);
    const result = await sendLoginOtp(email);
    setSendLoading(false);
    if (result.ok) {
      setResendCooldown(RESEND_COOLDOWN_SEC);
      const interval = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(interval);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      setStatus({ type: "success", message: "New code sent." });
      setCode(Array(OTP_LENGTH).fill(""));
      slotRefs.current[0]?.focus();
    } else {
      const isRateLimit = /wait|rate|limit/i.test(result.error);
      setStatus({
        type: "error",
        message: isRateLimit
          ? "Please wait a moment before requesting a new code."
          : result.error,
      });
    }
  };

  const backToEmail = () => {
    setStep("email");
    setStatus(null);
    setCode(Array(OTP_LENGTH).fill(""));
  };

  return (
    <main className="min-h-svh flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl border border-brand-rose/40 bg-white/80 p-8 shadow-xl backdrop-blur-xl"
      >
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Sign in
        </h1>

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSendCode}
              className="mt-6 space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a 6-digit code. No
                password needed.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sendLoading}
                  required
                  className="w-full rounded-xl border-border/80"
                  autoComplete="email"
                />
              </div>
              {status && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm ${
                    status.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {status.message}
                </motion.p>
              )}
              <Button
                type="submit"
                className="w-full rounded-full bg-brand-rose text-white hover:bg-brand-rose/90"
                disabled={sendLoading}
              >
                {sendLoading ? "Sending…" : "Send code"}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="code"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerify}
              className="mt-6 space-y-6"
            >
              <p className="text-sm text-muted-foreground">
                We sent a sign-in email to{" "}
                <strong className="text-foreground">{email}</strong>. Enter the
                <strong className="text-foreground">
                  {" "}
                  {OTP_LENGTH}-digit code
                </strong>{" "}
                from that message below.
              </p>
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Only see a link?
                </span>{" "}
                Your Supabase project must include{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  {"{{ .Token }}"}
                </code>{" "}
                in the <strong>Magic link</strong> email template. Copy the HTML
                from{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  supabase/templates/magic_link.html
                </code>{" "}
                — full steps in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  docs/SUPABASE_EMAIL_OTP_SETUP.md
                </code>
                .
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      slotRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => setCodeDigit(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    className="h-11 w-9 rounded-lg border border-brand-rose/50 bg-white/90 text-center text-base font-semibold text-foreground shadow-sm focus:border-brand-rose focus:outline-none focus:ring-2 focus:ring-brand-rose/30 sm:h-12 sm:w-10 sm:rounded-xl sm:text-lg"
                    disabled={verifyLoading}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              {status && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm ${
                    status.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {status.message}
                </motion.p>
              )}
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full rounded-full bg-brand-rose text-white hover:bg-brand-rose/90"
                  disabled={
                    verifyLoading || code.join("").length !== OTP_LENGTH
                  }
                >
                  {verifyLoading ? "Verifying…" : "Verify and sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={sendLoading}
                      className="text-brand-rose underline underline-offset-2 hover:no-underline"
                    >
                      Resend code
                    </button>
                  )}
                </p>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  ← Use a different email
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            ← Back home
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

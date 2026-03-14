"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithMagicLink } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setStatus(null);
    const result = await signInWithMagicLink(email);
    setLoading(false);
    if (result.ok) {
      setStatus({ type: "success", message: result.message });
      setEmail("");
    } else {
      setStatus({ type: "error", message: result.error });
    }
  }

  return (
    <main className="container mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a magic link to sign in. No
          password needed.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="w-full"
            />
          </div>
          {status && (
            <p
              className={`text-sm ${
                status.type === "success"
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              {status.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            ← Back home
          </Link>
        </p>
      </div>
    </main>
  );
}

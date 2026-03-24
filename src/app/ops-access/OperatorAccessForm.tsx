"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockOperatorTools } from "@/features/admin/actions/operator-access-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OperatorAccessFormProps {
  nextPath: string;
}

export function OperatorAccessForm({ nextPath }: OperatorAccessFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unlockOperatorTools(password);
      if (!result.success) {
        setError(result.error ?? "Could not unlock tools.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-white/15 bg-[rgba(40,40,42,0.85)] p-6 shadow-xl backdrop-blur-xl"
    >
      <div>
        <h1 className="font-serif text-2xl font-bold text-white">
          Operator Access
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Temporary password gate for admin and teacher tools.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="operator-password" className="text-white/80">
          Access password
        </Label>
        <Input
          id="operator-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          className="border-white/20 bg-black/25 text-white"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || password.trim().length === 0}
        className="w-full rounded-full bg-[#FDA4AF] text-[#1a1a1c] hover:bg-[#FDA4AF]/90"
      >
        {pending ? "Unlocking..." : "Unlock admin tools"}
      </Button>
    </form>
  );
}

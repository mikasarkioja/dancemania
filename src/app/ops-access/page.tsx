import { redirect } from "next/navigation";
import {
  hasOperatorPasswordAccess,
  isOperatorPasswordEnabled,
} from "@/lib/auth/operator-access";
import { OperatorAccessForm } from "./OperatorAccessForm";

function sanitizeNextPath(raw?: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/admin";
  }
  return raw;
}

export default async function OpsAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const configured = isOperatorPasswordEnabled();
  if (!configured) {
    redirect("/login");
  }

  const { next } = await searchParams;
  const nextPath = sanitizeNextPath(next);
  const alreadyUnlocked = await hasOperatorPasswordAccess();
  if (alreadyUnlocked) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#1a1a1c] px-4">
      <OperatorAccessForm nextPath={nextPath} />
    </main>
  );
}

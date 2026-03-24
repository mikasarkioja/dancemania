"use server";

import {
  clearOperatorPasswordAccess,
  grantOperatorPasswordAccess,
  isOperatorPasswordEnabled,
  isOperatorPasswordValid,
} from "@/lib/auth/operator-access";

export async function unlockOperatorTools(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!isOperatorPasswordEnabled()) {
    return { success: false, error: "Operator password is not configured." };
  }

  if (!isOperatorPasswordValid(password)) {
    return { success: false, error: "Invalid password." };
  }

  await grantOperatorPasswordAccess();
  return { success: true };
}

export async function lockOperatorTools(): Promise<void> {
  await clearOperatorPasswordAccess();
}

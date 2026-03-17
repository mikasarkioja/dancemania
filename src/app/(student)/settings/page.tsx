import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/features/user/components/SettingsView";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-[100svh] bg-brand-champagne/50 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <SettingsView />
      </div>
    </main>
  );
}

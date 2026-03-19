import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileView } from "@/features/user/components/ProfileView";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, bio, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-svh bg-brand-champagne/50 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ProfileView
          profile={{
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            bio: profile?.bio ?? null,
            role: (profile?.role as string) ?? "student",
          }}
        />
      </div>
    </main>
  );
}

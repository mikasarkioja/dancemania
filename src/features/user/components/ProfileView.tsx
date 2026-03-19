"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "../actions/profile-actions";
import { toast } from "sonner";

export interface ProfileViewProps {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: string;
  };
}

export function ProfileView({ profile: initialProfile }: ProfileViewProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [fullName, setFullName] = useState(initialProfile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (result.success) {
      setMode("view");
      toast.success("Profile updated.");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/50 bg-white/60 text-foreground shadow-sm backdrop-blur-md hover:bg-white/80"
          aria-label="Back to dashboard"
        >
          ←
        </Link>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Your profile
        </h1>
      </div>

      <motion.div
        layout
        className="rounded-2xl border border-brand-rose/30 bg-white/80 p-6 shadow-lg backdrop-blur-md"
      >
        <AnimatePresence mode="wait">
          {mode === "view" ? (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover border-2 border-brand-rose/30"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-rose/20 font-serif text-2xl text-brand-rose">
                    {fullName?.slice(0, 1)?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-serif text-xl font-semibold text-foreground">
                    {fullName || "No name set"}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {initialProfile.role}
                  </p>
                </div>
              </div>
              {bio && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {bio}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setMode("edit")}
              >
                Edit profile
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Dance goals / bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A few words about your dance journey or goals..."
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setFullName(initialProfile.full_name ?? "");
                    setAvatarUrl(initialProfile.avatar_url ?? "");
                    setBio(initialProfile.bio ?? "");
                    setMode("view");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-brand-rose text-white hover:bg-brand-rose/90"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

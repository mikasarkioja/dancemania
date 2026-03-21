"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUserRole } from "@/features/admin/actions/user-actions";
import { toast } from "sonner";
import type { AdminDirectoryUser } from "@/features/admin/data/admin-dashboard";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const personaStyles: Record<string, string> = {
  Seedling: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Blossom: "bg-[#FDA4AF]/20 text-[#FDA4AF] border-[#FDA4AF]/35",
  Performer: "bg-amber-500/20 text-amber-200 border-amber-500/35",
};

export function AdminUserDirectory({
  users: initialUsers,
}: {
  users: AdminDirectoryUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const handleRoleChange = async (
    userId: string,
    role: "student" | "teacher" | "admin"
  ) => {
    setUpdatingId(userId);
    const result = await updateUserRole(userId, role);
    setUpdatingId(null);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      toast.success("Role updated.");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section
      id="directory"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-[rgba(40,40,42,0.75)] p-5 backdrop-blur-xl"
      aria-labelledby="directory-heading"
    >
      <h2
        id="directory-heading"
        className="font-serif text-xl font-semibold text-white"
      >
        User directory
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Searchable roster with Bloom persona (from Omatase) and role controls.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-md rounded-xl border-white/15 bg-black/20 text-white placeholder:text-white/35"
        />
        <p className="text-xs text-white/40 tabular-nums">
          {filtered.length} user{filtered.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/20 text-left text-xs uppercase tracking-wide text-white/45">
              <th className="px-4 py-3 font-medium">Display name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Bloom</th>
              <th className="px-4 py-3 font-medium">Join date</th>
              <th className="px-4 py-3 font-medium text-right">Practices</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-medium text-white">
                  {user.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-white/55">{user.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role}
                    onValueChange={(value) =>
                      handleRoleChange(
                        user.id,
                        value as "student" | "teacher" | "admin"
                      )
                    }
                    disabled={updatingId === user.id}
                  >
                    <SelectTrigger className="h-9 w-[128px] rounded-lg border-white/15 bg-black/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      personaStyles[user.persona] ?? personaStyles.Seedling
                    )}
                  >
                    {user.persona}
                  </span>
                  <span className="ml-2 text-[10px] text-white/35 tabular-nums">
                    {user.omatase} XP
                  </span>
                </td>
                <td className="px-4 py-3 text-white/55 tabular-nums text-xs">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white/80">
                  {user.practice_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-white/45">
            {search ? "No matches." : "No profiles yet."}
          </p>
        )}
      </div>
      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-white/45">
            Page {safePage + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

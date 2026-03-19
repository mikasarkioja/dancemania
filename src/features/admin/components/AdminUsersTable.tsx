"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { updateUserRole } from "../actions/user-actions";
import { toast } from "sonner";

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "teacher" | "admin";
  practice_count: number;
}

export interface AdminUsersTableProps {
  users: AdminUserRow[];
}

export function AdminUsersTable({ users: initialUsers }: AdminUsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-xl"
        />
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-foreground">
                  Role
                </th>
                <th className="text-right px-4 py-3 font-medium text-foreground">
                  Practice sessions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/60 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">{user.full_name ?? "—"}</td>
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
                      <SelectTrigger className="w-[120px] rounded-lg h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {user.practice_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            {search ? "No users match your search." : "No users yet."}
          </p>
        )}
      </div>
    </div>
  );
}

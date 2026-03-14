"use client";

import type { DanceGenre, MoveRole } from "@/types/dance";
import type { DifficultyLevel } from "../hooks/useDanceLibrary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const ROLES: { value: MoveRole; label: string }[] = [
  { value: "Leader", label: "Leader" },
  { value: "Follower", label: "Follower" },
];

const DIFFICULTIES: { value: DifficultyLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export interface StudentLibraryFiltersState {
  genre: DanceGenre | null;
  roles: MoveRole[];
  difficulties: DifficultyLevel[];
}

export interface StudentLibraryFiltersProps {
  filters: StudentLibraryFiltersState;
  onFiltersChange: (f: StudentLibraryFiltersState) => void;
  className?: string;
}

export function StudentLibraryFilters({
  filters,
  onFiltersChange,
  className,
}: StudentLibraryFiltersProps) {
  const toggleRole = (role: MoveRole) => {
    const next = filters.roles.includes(role)
      ? filters.roles.filter((r) => r !== role)
      : [...filters.roles, role];
    onFiltersChange({ ...filters, roles: next });
  };

  const toggleDifficulty = (d: DifficultyLevel) => {
    const next = filters.difficulties.includes(d)
      ? filters.difficulties.filter((x) => x !== d)
      : [...filters.difficulties, d];
    onFiltersChange({ ...filters, difficulties: next });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Genre is set by the Salsa/Bachata toggle in the header.
        </p>
        <div className="space-y-2">
          <Label>Role</Label>
          <div className="flex flex-col gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={filters.roles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((d) => (
              <label
                key={d.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={filters.difficulties.includes(d.value)}
                  onChange={() => toggleDifficulty(d.value)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import type { MoveRole } from "@/types/dance";
import type { LibraryFilters } from "../utils/filter-moves";
import {
  getUniqueCategories,
  getDifficultyBounds,
} from "../utils/filter-moves";
import type { DanceLibraryItem } from "@/types/dance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: MoveRole[] = ["Leader", "Follower", "Both"];

export interface FilterSidebarProps {
  /** Full library items (used to derive categories and difficulty bounds). */
  items: DanceLibraryItem[];
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  className?: string;
}

export function FilterSidebar({
  items,
  filters,
  onFiltersChange,
  className,
}: FilterSidebarProps) {
  const categories = getUniqueCategories(items);
  const { min: diffMin, max: diffMax } = getDifficultyBounds(items);

  const role = filters.role ?? "Both";
  const category = filters.category ?? "";
  const minDifficulty = filters.minDifficulty ?? diffMin;
  const maxDifficulty = filters.maxDifficulty ?? diffMax;
  const searchQuery = filters.searchQuery ?? "";

  const update = (patch: Partial<LibraryFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text search: label + tags */}
        <div className="space-y-2">
          <Label htmlFor="search">Search (label &amp; tags)</Label>
          <Input
            id="search"
            type="search"
            placeholder="e.g. turns, basic"
            value={searchQuery}
            onChange={(e) =>
              update({ searchQuery: e.target.value || undefined })
            }
            className="w-full"
          />
        </div>

        {/* Role: Tabs */}
        <div className="space-y-2">
          <Label>Role</Label>
          <Tabs
            value={role}
            onValueChange={(v) => update({ role: v as MoveRole })}
          >
            <TabsList className="grid w-full grid-cols-3">
              {ROLES.map((r) => (
                <TabsTrigger key={r} value={r} className="text-xs">
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Category: Select */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={category || "all"}
            onValueChange={(v) =>
              update({ category: v === "all" ? undefined : v })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty: min and max sliders */}
        <div className="space-y-3">
          <Label>
            Difficulty: {minDifficulty} – {maxDifficulty}
          </Label>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Slider
              min={diffMin}
              max={diffMax}
              step={0.5}
              value={[minDifficulty]}
              onValueChange={([v]) =>
                update({
                  minDifficulty: v,
                  maxDifficulty: Math.max(v, maxDifficulty),
                })
              }
              className="w-full"
            />
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Slider
              min={diffMin}
              max={diffMax}
              step={0.5}
              value={[maxDifficulty]}
              onValueChange={([v]) =>
                update({
                  maxDifficulty: v,
                  minDifficulty: Math.min(v, minDifficulty),
                })
              }
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

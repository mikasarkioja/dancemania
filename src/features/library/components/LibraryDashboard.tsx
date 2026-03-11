"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DanceLibraryItem } from "@/types/dance";
import type { LibraryFilters } from "../utils/filter-moves";
import { filterDanceLibrary } from "../utils/filter-moves";
import { FilterSidebar } from "./FilterSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface LibraryDashboardProps {
  initialItems: DanceLibraryItem[];
}

export function LibraryDashboard({ initialItems }: LibraryDashboardProps) {
  const [filters, setFilters] = useState<LibraryFilters>({});
  const filteredItems = useMemo(
    () => filterDanceLibrary(initialItems, filters),
    [initialItems, filters]
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <FilterSidebar
          items={initialItems}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </aside>
      <div className="min-w-0 flex-1">
        <p className="mb-4 text-sm text-muted-foreground">
          {filteredItems.length} video{filteredItems.length !== 1 ? "s" : ""}{" "}
          with{" "}
          {filteredItems.reduce((acc, i) => acc + i.instructions.length, 0)}{" "}
          matching segment
          {filteredItems.reduce((acc, i) => acc + i.instructions.length, 0) !==
          1
            ? "s"
            : ""}
        </p>
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No moves match the current filters. Try changing role, category,
              or difficulty.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      <Link
                        href={`/library/${item.id}`}
                        className="hover:underline"
                      >
                        {item.title}
                      </Link>
                    </CardTitle>
                    {item.slug && (
                      <p className="text-sm text-muted-foreground">
                        {item.slug}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {item.instructions.map((seg, i) => (
                        <li
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{seg.pattern}</span>
                          {seg.role && (
                            <Badge variant="secondary" className="text-xs">
                              {seg.role}
                            </Badge>
                          )}
                          {seg.category && (
                            <Badge variant="outline" className="text-xs">
                              {seg.category}
                            </Badge>
                          )}
                          {typeof seg.difficulty === "number" && (
                            <span className="text-muted-foreground">
                              Difficulty {seg.difficulty}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatTime(seg.startTime)} –{" "}
                            {formatTime(seg.endTime)}
                          </span>
                          <Link
                            href={`/library/${item.id}?t=${seg.startTime}`}
                            className="ml-auto text-primary underline"
                          >
                            Watch
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

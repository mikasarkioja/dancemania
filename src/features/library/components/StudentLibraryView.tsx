"use client";

import { useMemo, useState } from "react";
import { useDanceLibrary } from "../hooks/useDanceLibrary";
import type { MoveRole } from "@/types/dance";
import { videoMatchesSearch } from "../utils/search-instructions";
import { VideoCard } from "./VideoCard";
import {
  StudentLibraryFilters,
  type StudentLibraryFiltersState,
} from "./StudentLibraryFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const defaultFilters: StudentLibraryFiltersState = {
  genre: null,
  roles: [],
  difficulties: [],
};

export function StudentLibraryView() {
  const [filters, setFilters] =
    useState<StudentLibraryFiltersState>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hookFilters = useMemo(() => {
    const role: MoveRole | null =
      filters.roles.length === 0
        ? null
        : filters.roles.length === 2
          ? "Both"
          : filters.roles[0];
    const difficulty =
      filters.difficulties.length === 0
        ? null
        : filters.difficulties.length === 1
          ? filters.difficulties[0]
          : filters.difficulties;
    return {
      genre: filters.genre,
      difficulty,
      role,
    };
  }, [filters]);

  const { data, error, isLoading } = useDanceLibrary(hookFilters);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return data;
    return data.filter((video) =>
      videoMatchesSearch(video.instructions, searchQuery)
    );
  }, [data, searchQuery]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Filter sidebar: collapsible on mobile */}
      <aside className="w-full shrink-0 lg:w-64">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="w-full rounded-md border bg-muted/50 px-4 py-2 text-left text-sm font-medium"
          >
            {sidebarOpen ? "Hide filters" : "Show filters"}
          </button>
        </div>
        <div className={sidebarOpen ? "mt-2 block" : "hidden lg:block"}>
          <StudentLibraryFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="library-search">Search moves</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="library-search"
              type="search"
              placeholder="e.g. Pendulo, Box Step"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Results */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-sm text-destructive">
              {error.message}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading videos…</p>
        )}

        {!isLoading && !error && filteredBySearch.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No videos match your filters or search. Try changing filters or
              search terms.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filteredBySearch.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredBySearch.length} video
              {filteredBySearch.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBySearch.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

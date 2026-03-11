"use client";

import type { MoveRegistryEntry } from "@/types/dance";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MoveExplorerCard } from "./MoveExplorerCard";

export interface MoveExplorerProps {
  moves: MoveRegistryEntry[];
}

export function MoveExplorer({ moves }: MoveExplorerProps) {
  const byCategory = useMemo(() => {
    const map = new Map<string, MoveRegistryEntry[]>();
    for (const m of moves) {
      const cat = m.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [moves]);

  if (moves.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
        No moves in the registry yet. Add moves via the scout or admin.
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className="w-full"
      defaultValue={byCategory.length > 0 ? [byCategory[0][0]] : []}
    >
      {byCategory.map(([category, categoryMoves]) => (
        <AccordionItem key={category} value={category}>
          <AccordionTrigger className="text-base">
            {category} ({categoryMoves.length})
          </AccordionTrigger>
          <AccordionContent>
            <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {categoryMoves.map((move) => (
                <li key={move.id}>
                  <MoveExplorerCard move={move} />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

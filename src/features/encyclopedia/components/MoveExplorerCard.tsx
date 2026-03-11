"use client";

import type { MoveRegistryEntry } from "@/types/dance";
import { MotionSignatureView } from "./MotionSignatureView";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MoveExplorerCardProps {
  move: MoveRegistryEntry;
  className?: string;
}

export function MoveExplorerCard({ move, className }: MoveExplorerCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{move.name}</h3>
          <Badge variant={move.status === "pending" ? "secondary" : "default"}>
            {move.role}
          </Badge>
          {(move.status === "pending" || move.status === "candidate") && (
            <Badge variant="outline">
              {move.status === "candidate" ? "Candidate" : "Pending review"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{move.category}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <MotionSignatureView
            signature={move.biomechanical_signature}
            width={180}
            height={180}
            className="shrink-0 rounded-md border bg-muted/20"
          />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            {move.description ? (
              <p className="text-muted-foreground">{move.description}</p>
            ) : (
              <p className="italic text-muted-foreground">
                No description yet.
              </p>
            )}
            {move.teacher_tips && (
              <div>
                <p className="mb-1 font-medium">Teacher tips</p>
                <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                  {move.teacher_tips}
                </pre>
              </div>
            )}
          </div>
        </div>
        {move.source_urls && move.source_urls.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Sources: {move.source_urls.slice(0, 2).join(", ")}
            {move.source_urls.length > 2 && ` +${move.source_urls.length - 2}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

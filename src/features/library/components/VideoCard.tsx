"use client";

import Link from "next/link";
import type { PublishedVideo } from "../hooks/useDanceLibrary";
import { getMoveTagsFromInstructions } from "../utils/search-instructions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VideoCardProps {
  video: PublishedVideo;
  className?: string;
}

export function VideoCard({ video, className }: VideoCardProps) {
  const tags = getMoveTagsFromInstructions(video.instructions);

  return (
    <Link
      href={`/practice/${video.id}`}
      className="block transition-opacity hover:opacity-90"
    >
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow hover:shadow-md",
          className
        )}
      >
        <CardHeader className="pb-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
            {video.title}
          </h3>
          <p className="text-sm capitalize text-muted-foreground">
            {video.genre}
            {video.bpm != null && (
              <span className="ml-1.5">· {video.bpm} BPM</span>
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 8).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-normal"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 8}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

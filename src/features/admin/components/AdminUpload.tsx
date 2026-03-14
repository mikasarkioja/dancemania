"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressVideoForUpload } from "@/lib/utils/video-processor";
import type {
  DanceGenre,
  Difficulty,
  PartnerId,
  TrackingSeeds,
} from "@/types/dance";
import { PARTNER_LEAD, PARTNER_FOLLOWER } from "@/types/dance";
import { useAppGenre } from "@/contexts/GenreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { PartnerIdentificationStep } from "./PartnerIdentificationStep";

const GENRES: { value: DanceGenre; label: string }[] = [
  { value: "salsa", label: "Salsa" },
  { value: "bachata", label: "Bachata" },
  { value: "other", label: "Other" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const PARTNER_OPTIONS: { value: PartnerId; label: string }[] = [
  { value: PARTNER_LEAD, label: "Lead" },
  { value: PARTNER_FOLLOWER, label: "Follower" },
];

const VIDEOS_BUCKET = "videos";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function AdminUpload() {
  const { genre: appGenre } = useAppGenre();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [genre, setGenre] = useState<DanceGenre>(appGenre);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [bpm, setBpm] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [partnerMode, setPartnerMode] = useState<PartnerId>(PARTNER_LEAD);
  const [trackingSeeds, setTrackingSeeds] = useState<TrackingSeeds | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [compressBeforeUpload, setCompressBeforeUpload] = useState(false);
  const [compressProgress, setCompressProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Keep form genre in sync with master switch (Salsa/Bachata in header)
  useEffect(() => {
    setGenre(appGenre);
  }, [appGenre]);

  // Only show the current app genre + Other in the dropdown (no cross-selection)
  const genreOptions = GENRES.filter(
    (g) => g.value === appGenre || g.value === "other"
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(value));
    }
  };

  const handleVideoChange = (file: File | null) => {
    setVideoFile(file);
    setTrackingSeeds(null);
  };

  const handleSeedsChange = (seeds: TrackingSeeds) => {
    setTrackingSeeds(seeds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const finalSlug = slug.trim() || slugify(title);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!finalSlug) {
      setError("Slug is required.");
      return;
    }
    if (!videoFile) {
      setError("Please select a video file.");
      return;
    }
    if (!trackingSeeds) {
      setError(
        "Please complete Partner Identification (Leader and Follower seeds)."
      );
      return;
    }

    setLoading(true);
    setCompressProgress(null);

    const supabase = createClient();

    try {
      let fileToUpload: File = videoFile;
      if (compressBeforeUpload) {
        const blob = await compressVideoForUpload(videoFile, {
          onProgress: (p) => setCompressProgress(p),
        });
        fileToUpload = new File(
          [blob],
          videoFile.name.replace(/\.[^.]+$/, ".mp4"),
          {
            type: "video/mp4",
          }
        );
      }
      setCompressProgress(null);

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${finalSlug}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(VIDEOS_BUCKET)
        .upload(fileName, fileToUpload, { upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase
        .from("dance_library")
        .insert({
          slug: finalSlug,
          title: title.trim(),
          genre,
          difficulty,
          video_url: publicUrl,
          bpm: bpm.trim() ? parseInt(bpm, 10) : null,
          motion_dna: null,
          tracking_seeds: trackingSeeds,
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTitle("");
      setSlug("");
      setBpm("");
      setVideoFile(null);
      setTrackingSeeds(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    title.trim() &&
    (slug.trim() || slugify(title)) &&
    videoFile &&
    trackingSeeds &&
    !loading;

  return (
    <div className="mx-auto max-w-md space-y-8">
      {/* Step 1: Metadata + video select */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Basic step On1"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL-friendly, unique)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="basic-step-on1"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">Genre</Label>
          <Select
            value={genre}
            onValueChange={(v) => setGenre(v as DanceGenre)}
            disabled={loading}
          >
            <SelectTrigger id="genre">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genreOptions.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Matches the Salsa/Bachata toggle in the header. Switch there to add
            videos for the other genre.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
            disabled={loading}
          >
            <SelectTrigger id="difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner">Partner (for motion data separation)</Label>
          <Select
            value={String(partnerMode)}
            onValueChange={(v) => setPartnerMode(Number(v) as PartnerId)}
            disabled={loading}
          >
            <SelectTrigger id="partner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTNER_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Lead (0) / Follower (1). Use when you attach motion_dna later.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bpm">BPM (optional)</Label>
          <Input
            id="bpm"
            type="number"
            min={1}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="e.g. 96"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video">Video file</Label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compressBeforeUpload}
              onChange={(e) => setCompressBeforeUpload(e.target.checked)}
              disabled={loading}
              className="rounded border-input"
            />
            Compress to 720p, 30fps, H.264 before upload (client-side, may take
            a minute)
          </label>
          {compressProgress != null && (
            <p className="text-xs text-muted-foreground">
              Compressing… {Math.round(compressProgress * 100)}%
            </p>
          )}
          <Input
            id="video"
            type="file"
            accept="video/*"
            onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
          {videoFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {videoFile.name}. Complete Partner Identification below
              before submitting.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600" role="status">
            Video uploaded and added to dance library. Processing will run
            automatically.
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            "Upload to library"
          )}
        </Button>
      </form>

      {/* Step 2: Partner Identification (after video selected) */}
      {videoFile && (
        <PartnerIdentificationStep
          videoFile={videoFile}
          seeds={trackingSeeds}
          onSeedsChange={handleSeedsChange}
          onReset={() => setTrackingSeeds(null)}
          disabled={loading}
        />
      )}
    </div>
  );
}

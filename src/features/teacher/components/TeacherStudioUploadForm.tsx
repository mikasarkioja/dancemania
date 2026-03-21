"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processTeacherUpload } from "@/features/teacher/actions/teacher-upload-actions";
import { cn } from "@/lib/utils";

const ACCEPT = "video/mp4,video/quicktime,.mp4,.mov";

export function TeacherStudioUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<"salsa" | "bachata">("salsa");
  const [difficultyStars, setDifficultyStars] = useState("3");
  const [description, setDescription] = useState("");

  const pickFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    const name = f.name.toLowerCase();
    if (!name.endsWith(".mp4") && !name.endsWith(".mov")) {
      toast.error("Use .mp4 or .mov only.");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) pickFile(f);
    },
    [pickFile]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Add a video file.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("video", file);
    fd.set("title", title.trim());
    fd.set("genre", genre);
    fd.set("difficultyStars", difficultyStars);
    fd.set("description", description.trim());
    const result = await processTeacherUpload(fd);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Upload received — extraction is running.");
    setFile(null);
    setTitle("");
    setDescription("");
    setDifficultyStars("3");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-3xl border border-[#FDA4AF]/25 bg-white/[0.06] p-6 shadow-xl backdrop-blur-xl"
    >
      <h2 className="font-serif text-xl font-semibold text-white">
        Upload a move
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Private studio vault — only you (and admins) can access this file until
        it is published.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <Label className="text-white/80">Move name</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cross-body lead with flair"
            required
            className="mt-1.5 rounded-xl border-white/15 bg-black/25 text-white placeholder:text-white/35"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-white/80">Genre</Label>
            <Select
              value={genre}
              onValueChange={(v) => setGenre(v as "salsa" | "bachata")}
            >
              <SelectTrigger className="mt-1.5 rounded-xl border-white/15 bg-black/25 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salsa">Salsa</SelectItem>
                <SelectItem value="bachata">Bachata</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80">Difficulty (1–5)</Label>
            <Select value={difficultyStars} onValueChange={setDifficultyStars}>
              <SelectTrigger className="mt-1.5 rounded-xl border-white/15 bg-black/25 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} —{" "}
                    {n <= 2 ? "Foundations" : n === 3 ? "Intermediate" : "Pro"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-white/80">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Timing notes, styling, or teaching intent…"
            className="mt-1.5 rounded-xl border-white/15 bg-black/25 text-white placeholder:text-white/35"
          />
        </div>

        <div>
          <Label className="text-white/80">Video (.mp4 or .mov)</Label>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById("teacher-video-input")?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "mt-1.5 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-colors",
              dragOver
                ? "border-[#FDA4AF] bg-[#FDA4AF]/10"
                : "border-white/20 bg-black/20 hover:border-[#FDA4AF]/50"
            )}
            onClick={() =>
              document.getElementById("teacher-video-input")?.click()
            }
          >
            <Upload className="mb-2 h-10 w-10 text-[#FDA4AF]/80" />
            <p className="text-center text-sm text-white/70">
              Drag and drop or click to browse
            </p>
            {file ? (
              <p className="mt-2 text-xs font-medium text-[#FDA4AF]">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            ) : (
              <p className="mt-2 text-xs text-white/40">MP4 / MOV</p>
            )}
            <input
              id="teacher-video-input"
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !file || !title.trim()}
          className="h-12 w-full rounded-full bg-[#FDA4AF] text-base font-semibold text-[#1a1a1c] hover:bg-[#FDA4AF]/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            "Upload & start AI extraction"
          )}
        </Button>
      </div>
    </form>
  );
}

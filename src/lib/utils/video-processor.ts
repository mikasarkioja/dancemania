/**
 * Client-side video compression via ffmpeg.wasm.
 * Compresses to 720p, 30fps, H.264 before upload to Supabase Storage.
 *
 * Requires SharedArrayBuffer (COOP/COEP headers) in production.
 * Load FFmpeg only when needed (dynamic import) to avoid blocking initial load.
 */

const INPUT_NAME = "input";
const OUTPUT_NAME = "output.mp4";

export interface VideoProcessorOptions {
  /** Scale height (default 720). Width auto (-2) keeps aspect. */
  height?: number;
  /** Target fps (default 30). */
  fps?: number;
  /** Progress callback 0–1. */
  onProgress?: (progress: number) => void;
}

/**
 * Compress a video file to 720p, 30fps, H.264 (and AAC audio if present).
 * Returns a Blob suitable for upload (e.g. to Supabase Storage).
 */
export async function compressVideoForUpload(
  file: File,
  options: VideoProcessorOptions = {}
): Promise<Blob> {
  const { height = 720, fps = 30, onProgress } = options;

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress);
    });
  }

  await ffmpeg.load();

  await ffmpeg.writeFile(INPUT_NAME, await fetchFile(file));

  // scale=-2:HEIGHT keeps aspect and width multiple of 2; -r fps; H.264 + AAC
  await ffmpeg.exec([
    "-i",
    INPUT_NAME,
    "-vf",
    `scale=-2:${height}`,
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    OUTPUT_NAME,
  ]);

  const data = await ffmpeg.readFile(OUTPUT_NAME);
  await ffmpeg.deleteFile(INPUT_NAME);
  await ffmpeg.deleteFile(OUTPUT_NAME);

  const bytes =
    data instanceof Uint8Array
      ? new Uint8Array(data.length).map((_, i) => data[i])
      : new Uint8Array(0);
  return new Blob([bytes], { type: "video/mp4" });
}

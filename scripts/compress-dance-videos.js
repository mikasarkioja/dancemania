#!/usr/bin/env node
/**
 * Compress multiple dance videos in a folder (for use before importing to the app).
 * Requires ffmpeg installed and on PATH: https://ffmpeg.org/download.html
 *
 * Usage:
 *   node scripts/compress-dance-videos.js
 *   node scripts/compress-dance-videos.js --input ./my-videos --output ./compressed
 *   node scripts/compress-dance-videos.js --input ./clips --concurrency 2
 *
 * Options:
 *   --input <dir>      Folder containing videos (default: ./videos-to-compress)
 *   --output <dir>     Folder for compressed files (default: ./compressed)
 *   --concurrency <n>  Max parallel jobs (default: 2)
 *   --crf <n>          Quality 0–51, lower = better (default: 23)
 *   --max-width <n>    Scale down to this width if larger (default: 1280)
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const VIDEO_EXT = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"];
const DEFAULT_INPUT = path.join(process.cwd(), "videos-to-compress");
const DEFAULT_OUTPUT = path.join(process.cwd(), "compressed");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    concurrency: 2,
    crf: 23,
    maxWidth: 1280,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) opts.input = path.resolve(args[++i]);
    else if (args[i] === "--output" && args[i + 1]) opts.output = path.resolve(args[++i]);
    else if (args[i] === "--concurrency" && args[i + 1]) opts.concurrency = Math.max(1, parseInt(args[++i], 10) || 2);
    else if (args[i] === "--crf" && args[i + 1]) opts.crf = Math.max(0, Math.min(51, parseInt(args[++i], 10) || 23));
    else if (args[i] === "--max-width" && args[i + 1]) opts.maxWidth = parseInt(args[++i], 10) || 1280;
  }
  return opts;
}

function getVideoFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => VIDEO_EXT.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f));
}

function compressOne(inputPath, outputPath, opts) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-crf", String(opts.crf),
      "-preset", "medium",
      "-vf", `scale='min(${opts.maxWidth},iw)':-2`,
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-500)}`));
    });
    proc.on("error", (err) => reject(err));
  });
}

async function run() {
  const opts = parseArgs();
  const inputDir = opts.input;
  const outputDir = opts.output;

  console.log("Options:", { input: inputDir, output: outputDir, concurrency: opts.concurrency, crf: opts.crf, maxWidth: opts.maxWidth });

  const files = getVideoFiles(inputDir);
  if (files.length === 0) {
    console.log("No video files found in", inputDir);
    console.log("Supported extensions:", VIDEO_EXT.join(", "));
    console.log("Create a folder (e.g. videos-to-compress), put videos there, then run again.");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const queue = files.slice();
  const running = new Set();
  let index = 0;

  function next() {
    if (queue.length === 0 && running.size === 0) return;
    while (queue.length > 0 && running.size < opts.concurrency) {
      const inputPath = queue.shift();
      const base = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${base}.mp4`);
      const i = ++index;
      const task = compressOne(inputPath, outputPath, opts)
        .then(() => {
          console.log(`[${i}/${files.length}] OK: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
        })
        .catch((err) => {
          console.error(`[${i}/${files.length}] FAIL: ${path.basename(inputPath)}`, err.message);
        })
        .finally(() => {
          running.delete(task);
          next();
        });
      running.add(task);
    }
  }

  console.log(`Compressing ${files.length} video(s)...\n`);
  next();

  while (running.size > 0) {
    await Promise.all([...running]);
  }
  console.log("\nDone. Output folder:", outputDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

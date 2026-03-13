# Compress dance videos before importing

Use this script to compress multiple videos in a folder at once (saves space and speeds up uploads).

## Prerequisites

- **ffmpeg** must be installed and on your PATH.
  - Windows: [Download](https://ffmpeg.org/download.html) or `choco install ffmpeg`
  - macOS: `brew install ffmpeg`

## Quick start

1. Create a folder and put your dance videos in it, for example:
   ```
   project/
   └── videos-to-compress/
       ├── salsa-basic.mp4
       ├── bachata-demo.mov
       └── ...
   ```

2. From the project root run:
   ```bash
   npm run compress-videos
   ```
   Compressed files are written to `./compressed/` (e.g. `salsa-basic.mp4`, `bachata-demo.mp4`).

## Custom folders and options

```bash
node scripts/compress-dance-videos.js --input ./my-videos --output ./ready-to-import
```

| Option           | Default                  | Description |
|------------------|--------------------------|-------------|
| `--input <dir>`  | `./videos-to-compress`    | Folder with source videos |
| `--output <dir>` | `./compressed`           | Folder for compressed files |
| `--concurrency <n>` | 2                     | Number of videos to encode in parallel |
| `--crf <n>`      | 23                       | Quality (0–51, lower = better, 23 is good) |
| `--max-width <n>`| 1280                      | Scale down to this width if larger |

Examples:

```bash
# Higher quality (larger files)
node scripts/compress-dance-videos.js --crf 18

# One job at a time
node scripts/compress-dance-videos.js --concurrency 1

# Custom paths
node scripts/compress-dance-videos.js --input D:\DanceClips --output D:\Compressed
```

Supported extensions: `.mp4`, `.mov`, `.webm`, `.avi`, `.mkv`, `.m4v`. Output is always `.mp4` (H.264 + AAC, web-friendly).

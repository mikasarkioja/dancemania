# Process Dance Video API

**POST** `/api/process-dance-video`

Calls the Python extraction bridge to generate `motion_dna` from a video, then updates the `dance_library` row and sets `status` to `needs_labeling`.

## Request

- **Body (JSON):** `{ rowId?: string, videoUrl?: string }`
  - `rowId`: `dance_library.id` to update (preferred).
  - `videoUrl`: If `rowId` is omitted, the row is looked up by `video_url`.

## Expected JSON response from Python bridge

The extraction service (`EXTRACTION_SERVICE_URL`) must respond to **POST** with a JSON body that matches **PoseData** (`@/types/dance`):

| Field        | Type                                    | Required |
| ------------ | --------------------------------------- | -------- |
| `frames`     | `PoseFrame[]`                           | yes      |
| `durationMs` | number                                  | yes      |
| `source`     | `"teacher" \| "student" \| "reference"` | no       |
| `metadata`   | `{ beat_timestamps?: number[] }`        | no       |

Each **PoseFrame**:

| Field        | Type                                      | Required                        |
| ------------ | ----------------------------------------- | ------------------------------- |
| `timestamp`  | number (ms or seconds, consistent)        | yes                             |
| `partner_id` | `0` (Lead) or `1` (Follower)              | yes                             |
| `joints`     | `Record<string, { x, y, z, visibility }>` | yes                             |
| `metrics`    | `{ rhythm_pulse, joint_angles }`          | no (recommended for downstream) |

Joint keys: e.g. `left_shoulder`, `right_shoulder`, `left_hip`, `right_hip`, `left_knee`, `right_knee`, `left_ankle`, `right_ankle`, `left_elbow`, `right_elbow`, `left_wrist`, `right_wrist`.

## Environment

- `EXTRACTION_SERVICE_URL`: URL of the Python bridge (POST with `{ video_url }`, returns PoseData JSON). If unset, the API returns 503.
- `EXTRACTION_API_KEY`: (Optional) Secret sent as `Authorization: Bearer` and `X-API-Key` for Python service auth.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for updating `dance_library` after extraction (bypasses RLS).

## Security

- **Guardian:** Only callers with `app_metadata.role` **admin** or **teacher** can trigger extraction. Others receive 403.

## Timeout / retry

- Request timeout: 90s (cold-start friendly).
- Retries: 2 (3 attempts total) with 3s delay between attempts.

## Supply chain logging

Each stage is logged for health monitoring:

- **Sent to AI** — rowId and video URL when the request is sent to the Python service.
- **AI Processing** — response status after the service responds.
- **Data Saved** — rowId, status `needs_labeling`, and frame count after the DB update.

## After success

- `dance_library.motion_dna` is set to the returned PoseData (via Service Role client).
- `dance_library.status` is set to **`needs_labeling`** (ready for Dictionary Lab).

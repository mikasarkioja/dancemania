# Salsa / Bachata mode

The app can be used in **Salsa** or **Bachata** mode. The choice is global and affects all data and menus.

## How it works

- **Header:** A **Salsa | Bachata** toggle in the site header sets the current mode. The selection is stored in a cookie (`dance_genre`) and in `localStorage` so it survives refresh and is available to server-rendered pages.
- **Library:** Only videos with `dance_library.genre` matching the selected mode are shown. The genre filter in the sidebar is replaced by a note that genre is set in the header.
- **Practice:** Practice videos are reached via the library, so they are already scoped by mode. The practice page links to the library.
- **Dashboard:** “Continue learning” videos and “Move of the day” are filtered by the current genre (from cookie). `move_registry` rows are included when `genre` matches or is null.
- **Encyclopedia:** Only moves with `move_registry.genre` matching the mode (or `genre` null) are listed.
- **Admin – Label:** The video list shows only `dance_library` rows for the selected genre. The pattern/move dropdown when labeling uses only `move_registry` entries for that genre (or null).
- **Admin – Dictionary Lab:** Only videos for the selected genre (with `motion_dna`) are listed.
- **Admin – Scanner (Run auto label):** Compares the video’s motion to registry moves of the **video’s** genre (from `dance_library.genre`), so suggestions are genre-appropriate.
- **Save to Registry:** When saving a move from Dictionary Lab, the video’s genre is stored on the new `move_registry` row when provided.

## Database

- **dance_library.genre:** Already exists (`salsa` | `bachata` | `other`). Used for all filtering.
- **move_registry.genre:** Added in migration `20250121000011_move_registry_genre.sql` (optional: `salsa` | `bachata` | `other`). Rows with `genre` null are shown in both modes until curated.

## Implementation

- **Client:** `GenreProvider` and `useAppGenre()` from `@/contexts/GenreContext`. On change, updates cookie and localStorage.
- **Server:** `getAppGenre()` from `@/lib/genre-server` reads the cookie and returns `"salsa"` or `"bachata"` (default `"salsa"` when the cookie is missing).

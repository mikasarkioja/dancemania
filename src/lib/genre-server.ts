import { cookies } from "next/headers";

export type AppGenre = "salsa" | "bachata";

const COOKIE_NAME = "dance_genre";
const DEFAULT: AppGenre = "salsa";

/**
 * Read the current app genre from the cookie (set by GenreProvider on client).
 * Use in server components and server actions to filter dance_library and move_registry.
 */
export async function getAppGenre(): Promise<AppGenre> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value === "salsa" || value === "bachata") return value;
  return DEFAULT;
}

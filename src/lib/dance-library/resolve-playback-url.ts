import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_TTL = 60 * 60 * 12;

export type DanceLibraryVideoSource = {
  video_url: string | null;
  source_bucket: string | null;
  storage_object_path: string | null;
};

/**
 * Returns a URL the browser can use for <video src> — public video_url or a signed URL for private storage.
 */
export async function resolveDanceLibraryPlaybackUrl(
  supabase: SupabaseClient,
  row: DanceLibraryVideoSource
): Promise<string | null> {
  const trimmed = row.video_url?.trim() ?? "";
  if (trimmed.length > 0) return trimmed;

  const bucket = row.source_bucket?.trim();
  const path = row.storage_object_path?.trim();
  if (!bucket || !path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL);

  if (error || !data?.signedUrl) {
    console.warn("[resolveDanceLibraryPlaybackUrl]", error?.message);
    return null;
  }
  return data.signedUrl;
}

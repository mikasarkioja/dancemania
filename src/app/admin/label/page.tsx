import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getAppGenre } from "@/lib/genre-server";

export default async function AdminLabelPage() {
  const supabase = await createClient();
  const appGenre = await getAppGenre();
  const { data: rows } = await supabase
    .from("dance_library")
    .select("id, slug, title, video_url")
    .eq("genre", appGenre)
    .order("created_at", { ascending: false });

  return (
    <main className="container py-8">
      <h1 className="mb-2 text-2xl font-semibold">Label videos</h1>
      <p className="mb-6 text-muted-foreground">
        Select a video to add move segments and teacher instructions (overlay
        text during playback).
      </p>
      {rows && rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-2 rounded-md border p-3 transition-colors hover:bg-muted"
            >
              <Link href={`/admin/label/${row.id}`} className="min-w-0 flex-1">
                <span className="font-medium">{row.title}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {row.slug}
                </span>
              </Link>
              <Link
                href={`/admin/review/${row.id}`}
                className="shrink-0 text-sm text-primary underline"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          No videos in the library yet. Upload one from the Admin page first.
        </p>
      )}
      <p className="mt-6">
        <Link href="/admin" className="text-sm text-primary underline">
          ← Back to Admin
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="min-h-svh flex flex-col items-center justify-center px-4 bg-background">
      <h1 className="font-serif text-xl font-bold text-foreground">
        Sign-in issue
      </h1>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
        {message ?? "Something went wrong signing you in."}
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-primary underline underline-offset-4 hover:no-underline"
      >
        Back to home
      </Link>
    </main>
  );
}

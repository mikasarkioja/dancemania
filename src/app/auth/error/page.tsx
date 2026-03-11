export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main>
      <h1>Auth error</h1>
      <p>{message ?? "Something went wrong signing you in."}</p>
    </main>
  );
}

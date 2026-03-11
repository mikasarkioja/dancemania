import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>DanceAI</h1>
      <p>Salsa & Bachata posture and rhythm analysis</p>
      <nav>
        <Link href="/library">Library</Link>
        <span> · </span>
        <Link href="/encyclopedia">Encyclopedia</Link>
        <span> · </span>
        <Link href="/practice">Practice</Link>
        <span> · </span>
        <Link href="/admin">Admin</Link>
      </nav>
    </main>
  );
}

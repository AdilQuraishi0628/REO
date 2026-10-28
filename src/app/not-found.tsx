import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-state-page">
      <span className="eyebrow">404 · Wrong turn</span>
      <h1>This table isn&apos;t here.</h1>
      <p>The page may have moved, or the link may be out of date.</p>
      <Link className="button button-dark" href="/">Back to TableTap</Link>
    </main>
  );
}

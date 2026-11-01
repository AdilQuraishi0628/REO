import Link from "next/link";
import { Icon } from "@/components/icons";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">
            <Icon name="monogram-t" size={24} />
          </span>
          <span className="brand-name">TableTap</span>
        </Link>
        <Link href="/admin/login">Restaurant sign in</Link>
      </header>
      <article className="legal-content">
        <span className="eyebrow">TableTap · Effective October 26, 2026</span>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        {children}
      </article>
      <footer className="auth-legal-footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/">Home</Link>
      </footer>
    </main>
  );
}

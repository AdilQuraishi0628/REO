import Link from "next/link";
import { LegalFooter } from "@/components/auth-form";
import { Icon } from "@/components/icons";

export default function CheckEmailPage() {
  return (
    <main className="admin-login-page">
      <Link className="brand-lockup" href="/" aria-label="TableTap guest page">
        <span className="brand-mark">
          <Icon name="monogram-t" size={24} />
        </span>
        <span className="brand-name">TableTap</span>
      </Link>
      <section className="admin-login-card">
        <span className="eyebrow">One more step</span>
        <h1>Check your inbox.</h1>
        <p>
          We sent a verification link to your email. Verify your address to
          continue setting up your restaurant.
        </p>
        <Link className="button button-dark loyalty-submit" href="/admin/login">
          Return to sign in
        </Link>
        <div className="auth-links">
          <Link href="/admin/verify-email">Didn&apos;t receive the email? Send another link.</Link>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}

import Link from "next/link";
import AuthShell from "@/components/auth-shell";

export default function CheckEmailPage() {
  return (
    <AuthShell>
      <h1>Check your inbox</h1>
      <p className="auth-lead">
        We sent a verification link to your email. Verify your address to
        continue setting up your restaurant.
      </p>

      <Link className="auth-btn" href="/admin/login">
        <span>Return to sign in</span>
      </Link>

      <nav aria-label="Account links" className="auth-links">
        <Link href="/admin/verify-email">
          Didn&apos;t receive the email? Send another link.
        </Link>
      </nav>
    </AuthShell>
  );
}

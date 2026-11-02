import Link from "next/link";
import AuthShell from "@/components/auth-shell";

export default function AccountDeletedPage() {
  return (
    <AuthShell>
      <h1>Account deleted</h1>
      <p className="auth-lead">
        Thanks for building with TableTap. Your sign-in has been removed.
      </p>

      <Link className="auth-btn" href="/">
        <span>Return to TableTap</span>
      </Link>
    </AuthShell>
  );
}

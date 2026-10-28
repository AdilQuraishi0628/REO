import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <span className="eyebrow">Account removed</span>
        <h1>Your account has been deleted.</h1>
        <p>Thanks for building with TableTap. Your sign-in has been removed.</p>
        <Link className="button button-dark loyalty-submit" href="/">Return to TableTap</Link>
      </section>
    </main>
  );
}

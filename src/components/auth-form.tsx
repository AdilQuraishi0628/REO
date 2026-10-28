"use client";

import Link from "next/link";
import { useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password" | "resend-verification";

const copy: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: "Welcome back.",
    description: "Sign in to manage your restaurant's guest experience.",
    action: "Sign in",
  },
  signup: {
    title: "Set your table.",
    description: "Create your workspace and set up your restaurant in a few steps.",
    action: "Create account",
  },
  "forgot-password": {
    title: "Reset your password.",
    description: "We'll email you a secure link to choose a new password.",
    action: "Send reset link",
  },
  "reset-password": {
    title: "Choose a new password.",
    description: "Use at least 12 characters to keep your account secure.",
    action: "Update password",
  },
  "resend-verification": {
    title: "Verify your email.",
    description: "Enter your email and we'll send a fresh verification link if it needs one.",
    action: "Send verification link",
  },
};

async function responseError(response: Response) {
  const result: unknown = await response.json().catch(() => null);
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  )
    ? result.error
    : "Something went wrong. Please try again.";
}

export default function AuthForm({
  mode,
  initialNotice = "",
}: {
  mode: AuthMode;
  initialNotice?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const labels = copy[mode];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setMessage("");
    if (mode === "reset-password" && password !== confirmation) {
      setError("Those passwords don't match.");
      return;
    }
    if ((mode === "signup" || mode === "reset-password") && password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "reset-password") {
        const response = await fetch("/api/auth/update-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) {
          setError(await responseError(response));
          return;
        }
        window.location.assign("/admin");
        return;
      }

      const endpoint =
        mode === "login"
          ? "/api/auth/login"
          : mode === "signup"
            ? "/api/auth/signup"
            : mode === "forgot-password"
              ? "/api/auth/password-reset"
              : "/api/auth/resend-verification";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }

      if (mode === "login") {
        trackProductEvent("admin_signed_in");
        window.location.assign("/admin");
      } else if (mode === "signup") {
        trackProductEvent("signup_flow_completed");
        const result = await response.json() as { verified?: boolean };
        window.location.assign(result.verified ? "/onboarding" : "/auth/check-email");
      } else if (mode === "forgot-password") {
        trackProductEvent("password_reset_requested");
        setMessage("If an account exists for that email, a reset link is on its way.");
      } else {
        setMessage("If that address needs verification, a new link is on its way.");
      }
    } catch (submitError) {
      console.error("Authentication form request failed:", submitError);
      setError("We couldn't reach the account service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <Link className="brand-lockup" href="/" aria-label="TableTap guest page">
        <span className="brand-mark">T</span>
        <span className="brand-name">TableTap</span>
      </Link>
      <section className="admin-login-card">
        <span className="eyebrow">Restaurant workspace</span>
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
        {initialNotice && <p aria-live="polite" className="auth-notice">{initialNotice}</p>}
        {message ? (
          <p aria-live="polite" className="auth-success-message">{message}</p>
        ) : (
          <form onSubmit={submit}>
            {mode !== "reset-password" && (
              <label className="loyalty-label" htmlFor="auth-email">
                Email address
                <input
                  autoComplete="email"
                  id="auth-email"
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
            )}
            {(mode === "login" || mode === "signup" || mode === "reset-password") && (
              <label className="loyalty-label" htmlFor="auth-password">
                {mode === "login" ? "Password" : "New password"}
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  id="auth-password"
                  maxLength={256}
                  minLength={mode === "login" ? 1 : 12}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            )}
            {mode === "reset-password" && (
              <label className="loyalty-label" htmlFor="auth-confirm-password">
                Confirm new password
                <input
                  autoComplete="new-password"
                  id="auth-confirm-password"
                  maxLength={256}
                  minLength={12}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type="password"
                  value={confirmation}
                />
              </label>
            )}
            {error && <p aria-live="assertive" className="form-error">{error}</p>}
            <button
              className="button button-dark loyalty-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Please wait..." : labels.action}
            </button>
          </form>
        )}
        <nav aria-label="Account links" className="auth-links">
          {mode === "login" && (
            <>
              <Link href="/admin/forgot-password">Forgot password?</Link>
              <Link href="/admin/verify-email">Resend verification email</Link>
              <Link href="/admin/signup">Create a restaurant account</Link>
            </>
          )}
          {mode === "signup" && <Link href="/admin/login">Already have an account? Sign in</Link>}
          {mode === "forgot-password" && <Link href="/admin/login">Back to sign in</Link>}
          {mode === "reset-password" && <Link href="/admin/login">Return to sign in</Link>}
          {mode === "resend-verification" && <Link href="/admin/login">Back to sign in</Link>}
        </nav>
      </section>
      <LegalFooter />
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="auth-legal-footer">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </footer>
  );
}

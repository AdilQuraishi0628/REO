"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { trackProductEvent } from "@/lib/product-analytics";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password" | "resend-verification";

type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
  address: string;
};

const copy: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: "Welcome to TableTap.",
    description: "Sign in to manage your digital menu, tables, and live orders in Raipur.",
    action: "Sign in to Dashboard",
  },
  signup: {
    title: "Launch Your Restaurant.",
    description: "Create an owner workspace to get instant table QR codes and digital ordering.",
    action: "Create Restaurant Workspace",
  },
  "forgot-password": {
    title: "Reset your password.",
    description: "We'll email you a secure link to choose a new password.",
    action: "Send Reset Link",
  },
  "reset-password": {
    title: "Choose a new password.",
    description: "Use at least 8 characters to keep your restaurant account secure.",
    action: "Update Password",
  },
  "resend-verification": {
    title: "Verify your email.",
    description: "Enter your email and we'll send a fresh verification link.",
    action: "Send Verification Link",
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
  initialTab = "owner",
}: {
  mode: AuthMode;
  initialNotice?: string;
  initialTab?: "owner" | "kitchen";
}) {
  const [activeTab, setActiveTab] = useState<"owner" | "kitchen">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff Login States
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);

  const labels = copy[mode];

  useEffect(() => {
    if (mode === "login") {
      setIsLoadingRestaurants(true);
      fetch("/api/auth/restaurants")
        .then((res) => res.json())
        .then((data: { restaurants?: RestaurantOption[] }) => {
          if (data.restaurants && data.restaurants.length > 0) {
            setRestaurants(data.restaurants);
            setSelectedRestaurantId(data.restaurants[0].id);
          }
        })
        .catch((err) => {
          console.warn("Failed to load restaurant options:", err);
        })
        .finally(() => {
          setIsLoadingRestaurants(false);
        });
    }
  }, [mode]);

  async function submitOwner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setMessage("");

    if (mode === "reset-password" && password !== confirmation) {
      setError("Those passwords don't match.");
      return;
    }
    if ((mode === "signup" || mode === "reset-password") && password.length < 8) {
      setError("Use a password with at least 8 characters.");
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
        const result = (await response.json()) as { verified?: boolean };
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

  async function submitStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setMessage("");

    if (!selectedRestaurantId) {
      setError("Please select your restaurant branch.");
      return;
    }
    if (!staffPin || staffPin.length < 4) {
      setError("Please enter the 4-digit staff PIN.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurantId,
          pin: staffPin.trim(),
        }),
      });

      if (!response.ok) {
        setError(await responseError(response));
        return;
      }

      const result = (await response.json()) as { redirectUrl?: string };
      window.location.assign(result.redirectUrl || "/kitchen");
    } catch (submitError) {
      console.error("Staff sign-in failed:", submitError);
      setError("Unable to authenticate staff session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <Link className="brand-lockup" href="/" aria-label="TableTap Home">
        <span className="brand-mark">
          <Icon name="monogram-t" size={24} />
        </span>
        <span className="brand-name">TableTap</span>
      </Link>

      <section className="admin-login-card">
        <div className="auth-card-header">
          <span className="eyebrow">Raipur Hospitality Platform</span>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>

        {initialNotice && (
          <p aria-live="polite" className="auth-notice">
            {initialNotice}
          </p>
        )}

        {/* Role Tab Switcher (Only on Login) */}
        {mode === "login" && (
          <div className="auth-role-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "owner"}
              className={`auth-role-tab ${activeTab === "owner" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("owner");
                setError("");
              }}
            >
              <Icon name="lock" size={15} />
              <span>Restaurant Owner</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "kitchen"}
              className={`auth-role-tab ${activeTab === "kitchen" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("kitchen");
                setError("");
              }}
            >
              <Icon name="clock" size={15} />
              <span>Kitchen / Staff PIN</span>
            </button>
          </div>
        )}

        {message ? (
          <p aria-live="polite" className="auth-success-message">
            {message}
          </p>
        ) : mode === "login" && activeTab === "kitchen" ? (
          /* Staff PIN Form */
          <form onSubmit={submitStaff} className="auth-form-content">
            <label className="loyalty-label" htmlFor="staff-restaurant">
              Select Restaurant Branch
              {isLoadingRestaurants ? (
                <div className="auth-select-loading">Loading Raipur restaurants...</div>
              ) : (
                <select
                  id="staff-restaurant"
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  required
                  className="auth-input-select"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.address || "Raipur"})
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="loyalty-label" htmlFor="staff-pin">
              Staff 4-Digit PIN
              <input
                id="staff-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="e.g. 1234"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                required
                autoComplete="current-password"
                className="auth-input-pin"
              />
            </label>

            <div className="staff-pin-hint">
              <Icon name="info" size={14} />
              <span>PIN is set by the restaurant manager in Admin Settings. Default is 1234.</span>
            </div>

            {error && (
              <p aria-live="assertive" className="form-error">
                {error}
              </p>
            )}

            <button
              className="button button-dark loyalty-submit"
              disabled={isSubmitting || isLoadingRestaurants}
              type="submit"
            >
              {isSubmitting ? "Verifying PIN..." : "Open Kitchen Display (KDS) →"}
            </button>
          </form>
        ) : (
          /* Owner Email/Password Form */
          <form onSubmit={submitOwner} className="auth-form-content">
            {mode !== "reset-password" && (
              <label className="loyalty-label" htmlFor="auth-email">
                Email Address
                <input
                  autoComplete="email"
                  id="auth-email"
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  placeholder="owner@yourrestaurant.in"
                  value={email}
                />
              </label>
            )}

            {(mode === "login" || mode === "signup" || mode === "reset-password") && (
              <label className="loyalty-label" htmlFor="auth-password">
                {mode === "login" ? "Password" : "New Password"}
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  id="auth-password"
                  maxLength={256}
                  minLength={mode === "login" ? 1 : 8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                />
              </label>
            )}

            {mode === "reset-password" && (
              <label className="loyalty-label" htmlFor="auth-confirm-password">
                Confirm New Password
                <input
                  autoComplete="new-password"
                  id="auth-confirm-password"
                  maxLength={256}
                  minLength={8}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmation}
                />
              </label>
            )}

            {error && (
              <p aria-live="assertive" className="form-error">
                {error}
              </p>
            )}

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
              <Link href="/admin/verify-email">Resend verification</Link>
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
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Service</Link>
    </footer>
  );
}

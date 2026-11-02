"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";

type AuthMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "resend-verification";

type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
  address: string;
};

const copy: Record<
  AuthMode,
  { title: string; description: string; action: string }
> = {
  login: {
    title: "Welcome back",
    description: "Sign in to manage your menu, tables and live orders.",
    action: "Sign in to dashboard",
  },
  signup: {
    title: "Launch your restaurant",
    description: "Create an owner account and get table QR codes and digital ordering.",
    action: "Create restaurant workspace",
  },
  "forgot-password": {
    title: "Reset your password",
    description: "Enter your email and we'll send you a link to set a new one.",
    action: "Send reset link",
  },
  "reset-password": {
    title: "Choose a new password",
    description: "Use at least 8 characters to keep your restaurant account secure.",
    action: "Update Password",
  },
  "resend-verification": {
    title: "Verify your email",
    description: "Enter your email and we'll send you a fresh verification link.",
    action: "Send verification link",
  },
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

async function responseError(response: Response) {
  const result: unknown = await response.json().catch(() => null);
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
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
  const [restaurantName, setRestaurantName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visible password rules verification
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d\W_]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumberOrSymbol;

  // Field-specific inline error messages
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Staff Login States
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const staffPin = pinDigits.join("");

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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

  const handlePinChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const nextDigits = [...pinDigits];

    if (!cleaned) {
      nextDigits[index] = "";
      setPinDigits(nextDigits);
      return;
    }

    const char = cleaned.slice(-1);
    nextDigits[index] = char;
    setPinDigits(nextDigits);
    setFieldErrors((prev) => ({ ...prev, pin: "" }));

    if (index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      e.preventDefault();
      const nextDigits = [...pinDigits];
      nextDigits[index - 1] = "";
      setPinDigits(nextDigits);
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (!pasted) return;

    const nextDigits = [...pinDigits];
    for (let i = 0; i < 4; i++) {
      nextDigits[i] = pasted[i] || "";
    }
    setPinDigits(nextDigits);
    setFieldErrors((prev) => ({ ...prev, pin: "" }));

    const focusIndex = Math.min(pasted.length, 3);
    pinRefs[focusIndex].current?.focus();
  };

  async function submitOwner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setMessage("");

    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();
    const trimmedRestaurant = restaurantName.trim();

    if (mode === "signup") {
      if (!trimmedRestaurant) {
        errors.restaurantName = "Enter your restaurant or café name.";
      }
    }

    if (mode !== "reset-password") {
      if (!trimmedEmail) {
        errors.email =
          mode === "login"
            ? "Enter the email you signed up with."
            : "Enter your email address.";
      } else if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.email = "That email doesn’t look right. Check for typos.";
      }
    }

    if (mode === "login") {
      if (!password) {
        errors.password = "Enter your password.";
      }
    } else if (mode === "signup") {
      if (!password) {
        errors.password = "Enter a password.";
      } else if (!isPasswordValid) {
        errors.password = "Password must meet all three requirements below.";
      }

      if (!confirmation) {
        errors.confirmation = "Please confirm your password.";
      } else if (password !== confirmation) {
        errors.confirmation = "Passwords do not match.";
      }

      if (!agreeToTerms) {
        errors.consent = "You must agree to the Terms of Service and Privacy Policy to continue.";
      }
    } else if (mode === "reset-password") {
      if (!password) {
        errors.password = "Enter your password.";
      } else if (password.length < 8) {
        errors.password = "Password needs at least 8 characters.";
      }

      if (!confirmation) {
        errors.confirmation = "Please confirm your password.";
      } else if (password !== confirmation) {
        errors.confirmation = "Those passwords don’t match.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

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

      const requestPayload =
        mode === "signup"
          ? { email: trimmedEmail, password, restaurantName: trimmedRestaurant }
          : { email: trimmedEmail, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
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

    const errors: Record<string, string> = {};
    if (!selectedRestaurantId) {
      errors.restaurant = "Please select your restaurant branch.";
    }
    const currentPin = staffPin.trim();
    if (!currentPin || currentPin.length < 4) {
      errors.pin = "Enter all 4 digits of the staff PIN.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurantId,
          pin: currentPin,
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
    <>
      <h1 id="auth-title">{labels.title}</h1>
      <p className="auth-lead">{labels.description}</p>

      {/* Role Switcher (Owner vs Kitchen Staff) on Login */}
      {mode === "login" && (
        <div
          className={`auth-seg ${activeTab === "kitchen" ? "r" : ""}`}
          id="seg"
          role="tablist"
        >
          <b aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "owner"}
            className={activeTab === "owner" ? "on" : ""}
            onClick={() => {
              setActiveTab("owner");
              setError("");
              setFieldErrors({});
            }}
          >
            <svg
              className="i"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span>Restaurant owner</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "kitchen"}
            className={activeTab === "kitchen" ? "on" : ""}
            onClick={() => {
              setActiveTab("kitchen");
              setError("");
              setFieldErrors({});
              setTimeout(() => pinRefs[0].current?.focus(), 50);
            }}
          >
            <svg
              className="i"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span>Kitchen staff</span>
          </button>
        </div>
      )}

      {initialNotice && (
        <div aria-live="polite" className="auth-notice-banner">
          {initialNotice}
        </div>
      )}

      {error && (
        <div
          aria-live="assertive"
          className="auth-notice-banner"
          style={{
            borderColor: "var(--auth-err)",
            color: "var(--auth-err)",
          }}
        >
          {error}
        </div>
      )}

      {message ? (
        <div aria-live="polite" className="auth-success-banner">
          {message}
        </div>
      ) : mode === "login" && activeTab === "kitchen" ? (
        /* Staff PIN Form */
        <form onSubmit={submitStaff} id="lf" noValidate>
          <label className="auth-label" htmlFor="staff-restaurant">
            Restaurant branch
          </label>
          {isLoadingRestaurants ? (
            <div
              className="auth-f"
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--auth-muted)",
              }}
            >
              Loading branches...
            </div>
          ) : (
            <select
              id="staff-restaurant"
              value={selectedRestaurantId}
              onChange={(e) => {
                setSelectedRestaurantId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, restaurant: "" }));
              }}
              required
              className={`auth-f ${fieldErrors.restaurant ? "bad" : ""}`}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.address ? `(${r.address})` : ""}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.restaurant && (
            <div className="auth-er">{fieldErrors.restaurant}</div>
          )}

          <label className="auth-label" id="pl" htmlFor="staff-pin">
            Staff PIN
          </label>
          {/* Hidden input for backward compatibility and test selectors */}
          <input
            type="hidden"
            id="staff-pin"
            name="staffPin"
            value={staffPin}
          />
          <div
            className="auth-pins"
            id="pins"
            role="group"
            aria-labelledby="pl"
          >
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                ref={pinRefs[i]}
                className={`auth-f ${fieldErrors.pin ? "bad" : ""}`}
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Digit ${i + 1}`}
                value={pinDigits[i]}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                onPaste={handlePinPaste}
              />
            ))}
          </div>
          {fieldErrors.pin && <div className="auth-er" id="e3">{fieldErrors.pin}</div>}

          <p className="auth-hint">
            Your manager sets this PIN in Admin settings.
          </p>

          <button
            className={`auth-btn ${isSubmitting ? "ld" : ""}`}
            id="lb"
            disabled={isSubmitting || isLoadingRestaurants}
            type="submit"
          >
            <span>
              {isSubmitting ? "Verifying PIN..." : "Open kitchen display"}
            </span>
          </button>
        </form>
      ) : (
        /* Owner Form */
        <form onSubmit={submitOwner} id="mo-form" noValidate>
          {mode === "signup" && (
            <div>
              <label className="auth-label" htmlFor="auth-restaurant-name">
                Restaurant or café name
              </label>
              <input
                autoComplete="organization"
                id="auth-restaurant-name"
                maxLength={100}
                onChange={(event) => {
                  setRestaurantName(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, restaurantName: "" }));
                }}
                required
                type="text"
                placeholder="e.g. Juniper &amp; Rye"
                value={restaurantName}
                className={`auth-f ${fieldErrors.restaurantName ? "bad" : ""}`}
              />
              {fieldErrors.restaurantName && (
                <div className="auth-er" id="e-rest">
                  {fieldErrors.restaurantName}
                </div>
              )}
            </div>
          )}

          {mode !== "reset-password" && (
            <div>
              <label className="auth-label" htmlFor="auth-email">
                Email address
              </label>
              <input
                autoComplete="email"
                id="auth-email"
                maxLength={254}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                required
                type="email"
                placeholder="owner@yourrestaurant.in"
                value={email}
                className={`auth-f ${fieldErrors.email ? "bad" : ""}`}
              />
              {fieldErrors.email && (
                <div className="auth-er" id="e1">
                  {fieldErrors.email}
                </div>
              )}
            </div>
          )}

          {(mode === "login" ||
            mode === "signup" ||
            mode === "reset-password") && (
            <div>
              <label className="auth-label" htmlFor="auth-password">
                {mode === "login" ? "Password" : "Password"}
              </label>
              <div className="auth-fw">
                <input
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  id="auth-password"
                  maxLength={256}
                  minLength={mode === "login" ? 1 : 8}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "login"
                      ? "••••••••••••"
                      : "Create a secure password"
                  }
                  value={password}
                  className={`auth-f ${fieldErrors.password ? "bad" : ""}`}
                />
                <button
                  type="button"
                  className="auth-eye"
                  id="eye"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18M10 6a9 9 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="auth-er" id="e2">
                  {fieldErrors.password}
                </div>
              )}

              {/* Visible Password Requirements on Signup */}
              {mode === "signup" && (
                <div
                  className="auth-rules-box"
                  style={{
                    marginTop: "8px",
                    padding: "10px 12px",
                    background: "rgba(114, 47, 55, 0.04)",
                    border: "1px solid var(--tt-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  aria-live="polite"
                >
                  <div style={{ fontWeight: 600, color: "var(--tt-ink)", marginBottom: "4px" }}>
                    Password rules:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "2px", color: "var(--tt-ink-muted)" }}>
                    <li style={{ color: hasMinLength ? "var(--tt-emerald, #10b981)" : "inherit", fontWeight: hasMinLength ? 600 : 400 }}>
                      {hasMinLength ? "✓" : "○"} At least 8 characters
                    </li>
                    <li style={{ color: hasLetter ? "var(--tt-emerald, #10b981)" : "inherit", fontWeight: hasLetter ? 600 : 400 }}>
                      {hasLetter ? "✓" : "○"} At least one letter
                    </li>
                    <li style={{ color: hasNumberOrSymbol ? "var(--tt-emerald, #10b981)" : "inherit", fontWeight: hasNumberOrSymbol ? 600 : 400 }}>
                      {hasNumberOrSymbol ? "✓" : "○"} At least one number or symbol
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {(mode === "signup" || mode === "reset-password") && (
            <div>
              <label className="auth-label" htmlFor="auth-confirm-password">
                {mode === "signup" ? "Confirm password" : "Confirm new password"}
              </label>
              <div className="auth-fw">
                <input
                  autoComplete="new-password"
                  id="auth-confirm-password"
                  maxLength={256}
                  minLength={8}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmation: "" }));
                  }}
                  required
                  type={showConfirmation ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmation}
                  className={`auth-f ${fieldErrors.confirmation ? "bad" : ""}`}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowConfirmation((prev) => !prev)}
                  aria-label={
                    showConfirmation ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmation ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18M10 6a9 9 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmation && (
                <div className="auth-er">{fieldErrors.confirmation}</div>
              )}
            </div>
          )}

          {/* Required Consent Checkbox on Signup */}
          {mode === "signup" && (
            <div style={{ marginTop: "12px", marginBottom: "4px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12px",
                  color: "var(--tt-ink)",
                  cursor: "pointer",
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  id="auth-consent"
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    setFieldErrors((prev) => ({ ...prev, consent: "" }));
                  }}
                  required
                  style={{
                    width: "16px",
                    height: "16px",
                    marginTop: "2px",
                    accentColor: "var(--tt-burgundy)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" style={{ color: "var(--tt-burgundy)", textDecoration: "underline", fontWeight: 600 }}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "var(--tt-burgundy)", textDecoration: "underline", fontWeight: 600 }}>
                    Privacy Policy
                  </Link>{" "}
                  (governed by the DPDP Act 2023).
                </span>
              </label>
              {fieldErrors.consent && (
                <div className="auth-er" style={{ marginTop: "4px" }}>
                  {fieldErrors.consent}
                </div>
              )}
            </div>
          )}

          <button
            className={`auth-btn ${isSubmitting ? "ld" : ""}`}
            id="lb-owner"
            disabled={isSubmitting}
            type="submit"
          >
            <span>
              {isSubmitting
                ? "Please wait..."
                : labels.action}
            </span>
          </button>
        </form>
      )}

      {/* Navigation links below the form */}
      <nav aria-label="Account links" className="auth-links">
        {mode === "login" && (
          <>
            <Link href="/admin/forgot-password">Forgot password?</Link>
            <Link href="/admin/verify-email">Resend verification</Link>
            <Link href="/admin/signup">Create a restaurant account</Link>
          </>
        )}
        {mode === "signup" && (
          <span>
            Already have an account? <Link href="/admin/login">Sign in</Link>
          </span>
        )}
        {mode === "forgot-password" && (
          <Link href="/admin/login">Back to sign in</Link>
        )}
        {mode === "reset-password" && (
          <Link href="/admin/login">Return to sign in</Link>
        )}
        {mode === "resend-verification" && (
          <Link href="/admin/login">Back to sign in</Link>
        )}
      </nav>
    </>
  );
}

export function LegalFooter() {
  return (
    <footer className="auth-foot">
      <Link href="/privacy">Privacy policy</Link>
      <Link href="/terms">Terms of service</Link>
    </footer>
  );
}

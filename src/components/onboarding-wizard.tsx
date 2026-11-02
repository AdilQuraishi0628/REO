"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import AuthShell from "@/components/auth-shell";
import GuestPagePreview from "@/components/guest-page-preview";
import { trackProductEvent } from "@/lib/product-analytics";

type SetupRestaurant = {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
  onboarding_step: number;
};

type SetupResponse = {
  error?: string;
  complete?: boolean;
  restaurant?: SetupRestaurant | null;
  step?: number;
  guestUrl?: string;
  linkId?: string;
  slug?: string;
};

async function requestSetup(
  body?: Record<string, unknown>
): Promise<SetupResponse> {
  const response = await fetch("/api/onboarding", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = (await response.json()) as SetupResponse;
  if (!response.ok) {
    throw new Error(result.error || "Could not save your setup.");
  }
  return result;
}

export default function OnboardingWizard({ email }: { email: string }) {
  const [restaurant, setRestaurant] = useState<SetupRestaurant | null>(null);
  const [step, setStep] = useState(0);
  const [guestUrl, setGuestUrl] = useState("");
  const [qrLinkId, setQrLinkId] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Controlled form values feeding live <GuestPagePreview>
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const [formItemName, setFormItemName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [formWifiSsid, setFormWifiSsid] = useState("");
  const [formWifiPassword, setFormWifiPassword] = useState("");

  const [formTableLabel, setFormTableLabel] = useState("");

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void requestSetup()
      .then((result) => {
        if (result.complete) {
          window.location.replace("/admin");
          return;
        }
        if (result.restaurant) {
          setRestaurant(result.restaurant);
          setFormName(result.restaurant.name || "");
          setStep(Math.max(1, result.restaurant.onboarding_step));
          setGuestUrl(result.guestUrl ?? "");
          setQrLinkId(result.linkId ?? "");
        }
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your setup."
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function save(
    event: React.FormEvent<HTMLFormElement>,
    action: string,
    data: Record<string, unknown>
  ) {
    event.preventDefault();
    if (isBusy) return;
    setError("");
    setFieldErrors({});

    // Inline field validation for Step 1
    if (action === "create-restaurant") {
      const errors: Record<string, string> = {};
      if (!String(data.name || "").trim()) {
        errors.name = "Enter your restaurant name.";
      }
      if (!String(data.address || "").trim()) {
        errors.address = "Enter your street address.";
      }
      if (!String(data.city || "").trim()) {
        errors.city = "Enter your city and postal code.";
      }
      if (!String(data.phone || "").trim()) {
        errors.phone = "Enter a contact phone number.";
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    setIsBusy(true);
    try {
      const result = await requestSetup({
        action,
        ...(restaurant ? { restaurantId: restaurant.id } : {}),
        ...data,
      });
      if (action === "create-restaurant" && result.restaurant) {
        setRestaurant(result.restaurant);
        setFormName(result.restaurant.name);
        setStep(1);
      } else if (action === "qr") {
        trackProductEvent("restaurant_qr_created");
        setStep(4);
        setGuestUrl(result.guestUrl ?? "");
        setQrLinkId(result.linkId ?? "");
      } else if (action === "finish" && result.slug) {
        setRestaurantSlug(result.slug);
        setStep(5);
      } else {
        setStep(result.step ?? step);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your setup."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function skipMenu() {
    setError("");
    setFieldErrors({});
    setIsBusy(true);
    try {
      const result = await requestSetup({
        action: "menu",
        restaurantId: restaurant?.id,
      });
      setStep(result.step ?? 2);
    } catch (skipError) {
      setError(
        skipError instanceof Error
          ? skipError.message
          : "Could not continue."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function finish() {
    if (!restaurant || isBusy) return;
    setError("");
    setIsBusy(true);
    try {
      const result = await requestSetup({
        action: "finish",
        restaurantId: restaurant.id,
      });
      setRestaurantSlug(result.slug ?? restaurant.slug);
      setStep(5);
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Could not publish your guest page."
      );
    } finally {
      setIsBusy(false);
    }
  }

  const copyGuestLink = async () => {
    if (!guestUrl) return;
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // 4-segment progress calculation
  // !restaurant => step 1 of 4
  // restaurant && step === 1 => step 2 of 4
  // restaurant && step === 2 => step 3 of 4
  // restaurant && step === 3 => step 4 of 4
  // restaurant && step === 4 => "Final step"
  const currentStepNumber = !restaurant
    ? 1
    : step === 1
      ? 2
      : step === 2
        ? 3
        : 4;

  const isFinalScreen = Boolean(restaurant && step === 4);

  const eyebrowText = isFinalScreen
    ? "Final step"
    : `Step ${currentStepNumber} of 4`;

  return (
    <AuthShell
      userEmail={email}
      panelTitle={
        <>
          Every table, <em>connected in minutes.</em>
        </>
      }
      panelSubtitle="Complete your venue profile, configure tables, and launch your mobile ordering page."
      panelSlot={
        <GuestPagePreview
          restaurantName={formName || restaurant?.name}
          restaurantCity={formCity}
          restaurantAddress={formAddress}
          itemName={formItemName}
          price={formPrice}
          description={formDescription}
          wifiSsid={formWifiSsid}
          wifiPassword={formWifiPassword}
          tableLabel={formTableLabel}
        />
      }
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--auth-muted)" }}>
          <div className="auth-btn ld" style={{ width: 44, height: 44, margin: "0 auto 16px", background: "none" }} />
          <p>Loading your restaurant setup...</p>
        </div>
      ) : step === 5 ? (
        /* Step 5: Success State */
        <div>
          <div className="onboarding-success-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="onboarding-eyebrow">Your table is ready</span>
          <h1>You&apos;re ready to welcome guests.</h1>
          <p className="auth-lead">
            Your guest page is live. Share your QR code and keep your menu fresh from the dashboard.
          </p>

          <Link
            className="auth-btn"
            href={`/${restaurantSlug}`}
            target="_blank"
            rel="noreferrer"
            style={{ marginBottom: "12px" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span>View live guest page</span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </span>
          </Link>

          <Link className="auth-btn auth-btn-outline" href="/admin">
            <span>Open dashboard</span>
          </Link>
        </div>
      ) : (
        <div>
          {/* 4-segment Progress Bar */}
          <div className="onboarding-progress-header">
            <span className="onboarding-eyebrow">{eyebrowText}</span>
            <div className="onboarding-segments" aria-hidden="true">
              {[1, 2, 3, 4].map((segIndex) => (
                <div
                  key={segIndex}
                  className={`onboarding-seg ${
                    segIndex <= currentStepNumber ? "active" : ""
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div
              aria-live="assertive"
              className="auth-notice-banner"
              style={{
                borderColor: "var(--auth-err)",
                color: "var(--auth-err)",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* Step 1: Restaurant Profile */}
          {!restaurant && (
            <div>
              <h1>Tell us about your restaurant</h1>
              <p className="auth-lead">
                We&apos;ll create a guest ordering page and venue workspace just for you.
              </p>
              <form
                noValidate
                onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "create-restaurant", {
                    name: form.get("name"),
                    address: form.get("address"),
                    city: form.get("city"),
                    phone: form.get("phone"),
                  });
                }}
              >
                <div>
                  <label className="auth-label" htmlFor="name">
                    Restaurant name
                  </label>
                  <input
                    autoComplete="organization"
                    maxLength={120}
                    name="name"
                    id="name"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Copper Chimney"
                    className={`auth-f ${fieldErrors.name ? "bad" : ""}`}
                  />
                  {fieldErrors.name && (
                    <div className="auth-er">{fieldErrors.name}</div>
                  )}
                </div>

                <div>
                  <label className="auth-label" htmlFor="address">
                    Street address
                  </label>
                  <input
                    autoComplete="street-address"
                    maxLength={200}
                    name="address"
                    id="address"
                    required
                    value={formAddress}
                    onChange={(e) => {
                      setFormAddress(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, address: "" }));
                    }}
                    placeholder="e.g. VIP Road, Telibandha"
                    className={`auth-f ${fieldErrors.address ? "bad" : ""}`}
                  />
                  {fieldErrors.address && (
                    <div className="auth-er">{fieldErrors.address}</div>
                  )}
                </div>

                <div>
                  <label className="auth-label" htmlFor="city">
                    City and postal code
                  </label>
                  <input
                    autoComplete="address-level2"
                    maxLength={120}
                    name="city"
                    id="city"
                    required
                    value={formCity}
                    onChange={(e) => {
                      setFormCity(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, city: "" }));
                    }}
                    placeholder="e.g. Raipur 492001"
                    className={`auth-f ${fieldErrors.city ? "bad" : ""}`}
                  />
                  {fieldErrors.city && (
                    <div className="auth-er">{fieldErrors.city}</div>
                  )}
                </div>

                <div>
                  <label className="auth-label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    autoComplete="tel"
                    maxLength={40}
                    name="phone"
                    id="phone"
                    required
                    type="tel"
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="e.g. +91 98765 43210"
                    className={`auth-f ${fieldErrors.phone ? "bad" : ""}`}
                  />
                  {fieldErrors.phone && (
                    <div className="auth-er">{fieldErrors.phone}</div>
                  )}
                </div>

                <button
                  className={`auth-btn ${isBusy ? "ld" : ""}`}
                  disabled={isBusy}
                  type="submit"
                >
                  <span>{isBusy ? "Creating workspace..." : "Continue"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Step 2: First Menu Item */}
          {restaurant && step === 1 && (
            <div>
              <h1>Add your first menu item</h1>
              <p className="auth-lead">
                Start with one item. You can add more and organize categories later.
              </p>
              <form
                onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "menu", {
                    itemName: form.get("itemName"),
                    description: form.get("description"),
                    price: form.get("price"),
                  });
                }}
              >
                <div>
                  <label className="auth-label" htmlFor="itemName">
                    Item name
                  </label>
                  <input
                    maxLength={120}
                    name="itemName"
                    id="itemName"
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="e.g. Signature Cold Brew"
                    className="auth-f"
                  />
                </div>

                <div>
                  <label className="auth-label" htmlFor="price">
                    Price (₹)
                  </label>
                  <input
                    min="0"
                    name="price"
                    id="price"
                    step="0.01"
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 180"
                    className="auth-f"
                  />
                </div>

                <div>
                  <label className="auth-label" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    maxLength={1000}
                    name="description"
                    id="description"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Single-estate beans brewed over 18 hours, served chilled."
                    className="auth-f"
                    style={{ minHeight: "84px", resize: "vertical" }}
                  />
                </div>

                <button
                  className={`auth-btn ${isBusy ? "ld" : ""}`}
                  disabled={isBusy}
                  type="submit"
                >
                  <span>{isBusy ? "Saving..." : "Save and continue"}</span>
                </button>

                <button
                  className="auth-btn-secondary"
                  disabled={isBusy}
                  onClick={() => void skipMenu()}
                  type="button"
                >
                  Skip for now
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Wi-Fi Setup */}
          {restaurant && step === 2 && (
            <div>
              <h1>Help guests get connected</h1>
              <p className="auth-lead">
                Add your venue Wi-Fi. Guests can view and copy credentials directly from the table page.
              </p>
              <form
                onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "wifi", {
                    wifiSsid: form.get("wifiSsid"),
                    wifiPassword: form.get("wifiPassword"),
                  });
                }}
              >
                <div>
                  <label className="auth-label" htmlFor="wifiSsid">
                    Wi-Fi network name (SSID)
                  </label>
                  <input
                    autoComplete="off"
                    maxLength={128}
                    name="wifiSsid"
                    id="wifiSsid"
                    value={formWifiSsid}
                    onChange={(e) => setFormWifiSsid(e.target.value)}
                    placeholder="e.g. TableTap_Guest"
                    className="auth-f"
                  />
                </div>

                <div>
                  <label className="auth-label" htmlFor="wifiPassword">
                    Wi-Fi password
                  </label>
                  <input
                    autoComplete="off"
                    maxLength={256}
                    name="wifiPassword"
                    id="wifiPassword"
                    value={formWifiPassword}
                    onChange={(e) => setFormWifiPassword(e.target.value)}
                    placeholder="e.g. coffee123"
                    className="auth-f"
                  />
                </div>

                <button
                  className={`auth-btn ${isBusy ? "ld" : ""}`}
                  disabled={isBusy}
                  type="submit"
                >
                  <span>{isBusy ? "Saving..." : "Continue"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Step 4: First QR Code */}
          {restaurant && step === 3 && (
            <div>
              <h1>Create your first QR code</h1>
              <p className="auth-lead">
                This unique link opens your digital menu. Add a table label if you want to identify order locations.
              </p>
              <form
                onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "qr", { tableLabel: form.get("tableLabel") });
                }}
              >
                <div>
                  <label className="auth-label" htmlFor="tableLabel">
                    Table / placement label <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    maxLength={80}
                    name="tableLabel"
                    id="tableLabel"
                    value={formTableLabel}
                    onChange={(e) => setFormTableLabel(e.target.value)}
                    placeholder="e.g. Front counter or Table 1"
                    className="auth-f"
                  />
                </div>

                <button
                  className={`auth-btn ${isBusy ? "ld" : ""}`}
                  disabled={isBusy}
                  type="submit"
                >
                  <span>{isBusy ? "Creating QR code..." : "Create QR and continue"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Step 4 Review: Ready to go live? */}
          {restaurant && step === 4 && (
            <div>
              <h1>Ready to go live?</h1>
              <p className="auth-lead">
                Your restaurant page and first QR link are ready. Publish your guest page to start welcoming guests.
              </p>

              {guestUrl && (
                <div className="onboarding-link-box">
                  <span className="onboarding-link-text">{guestUrl}</span>
                  <button
                    className="onboarding-copy-btn"
                    onClick={copyGuestLink}
                    type="button"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}

              {qrLinkId && restaurant && (
                <div className="onboarding-qr-card">
                  <Image
                    alt="Your restaurant guest-page QR code"
                    height={180}
                    src={`/api/admin/links/${qrLinkId}/qr`}
                    unoptimized
                    width={180}
                  />
                </div>
              )}

              {qrLinkId && (
                <a
                  href={`/api/admin/links/${qrLinkId}/qr`}
                  download="tabletap-qr.png"
                  className="auth-btn auth-btn-outline"
                  style={{ width: "100%", marginBottom: "12px", textDecoration: "none" }}
                >
                  <span>Download QR code</span>
                </a>
              )}

              <button
                className={`auth-btn ${isBusy ? "ld" : ""}`}
                disabled={isBusy}
                onClick={() => void finish()}
                type="button"
              >
                <span>{isBusy ? "Publishing..." : "Publish guest page"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}

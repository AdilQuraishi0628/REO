"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
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

async function requestSetup(body?: Record<string, unknown>): Promise<SetupResponse> {
  const response = await fetch("/api/onboarding", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await response.json() as SetupResponse;
  if (!response.ok) throw new Error(result.error || "Could not save your setup.");
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

  useEffect(() => {
    void requestSetup()
      .then((result) => {
        if (result.complete) {
          window.location.replace("/admin");
          return;
        }
        if (result.restaurant) {
          setRestaurant(result.restaurant);
          setStep(Math.max(1, result.restaurant.onboarding_step));
          setGuestUrl(result.guestUrl ?? "");
          setQrLinkId(result.linkId ?? "");
        }
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load your setup.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function save(
    event: React.FormEvent<HTMLFormElement>,
    action: string,
    data: Record<string, unknown>,
  ) {
    event.preventDefault();
    if (isBusy) return;
    setError("");
    setIsBusy(true);
    try {
      const result = await requestSetup({
        action,
        ...(restaurant ? { restaurantId: restaurant.id } : {}),
        ...data,
      });
      if (action === "create-restaurant" && result.restaurant) {
        setRestaurant(result.restaurant);
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
      setError(saveError instanceof Error ? saveError.message : "Could not save your setup.");
    } finally {
      setIsBusy(false);
    }
  }

  async function skipMenu() {
    setError("");
    setIsBusy(true);
    try {
      const result = await requestSetup({ action: "menu", restaurantId: restaurant?.id });
      setStep(result.step ?? 2);
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : "Could not continue.");
    } finally {
      setIsBusy(false);
    }
  }

  async function finish() {
    if (!restaurant || isBusy) return;
    setError("");
    setIsBusy(true);
    try {
      const result = await requestSetup({ action: "finish", restaurantId: restaurant.id });
      setRestaurantSlug(result.slug ?? restaurant.slug);
      setStep(5);
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Could not publish your guest page.");
    } finally {
      setIsBusy(false);
    }
  }

  const progress = Math.min(step + 1, 4);

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">T</span>
          <span className="brand-name">TableTap</span>
        </Link>
        <span>{email}</span>
      </header>
      <section className="onboarding-card">
        {isLoading ? (
          <p aria-live="polite" className="admin-loading">Loading your setup...</p>
        ) : step === 5 ? (
          <div className="onboarding-ready">
            <span className="onboarding-check" aria-hidden="true">✓</span>
            <span className="eyebrow">Your table is ready</span>
            <h1>You&apos;re ready to welcome guests.</h1>
            <p>Your guest page is live. Share your QR code and keep your menu fresh from the dashboard.</p>
            <div className="onboarding-ready-actions">
              <Link className="button button-dark" href={`/${restaurantSlug}`} target="_blank" rel="noreferrer">
                View guest page ↗
              </Link>
              <Link className="button button-light" href="/admin">Open dashboard</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="onboarding-progress">
              <span className="eyebrow">Getting started · Step {progress} of 4</span>
              <div aria-hidden="true" className="onboarding-progress-track">
                <span style={{ width: `${progress * 25}%` }} />
              </div>
            </div>
            {!restaurant && (
              <>
                <h1>Tell us about your restaurant.</h1>
                <p>We&apos;ll create a guest page and workspace just for you.</p>
                <form className="onboarding-form" onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "create-restaurant", {
                    name: form.get("name"),
                    address: form.get("address"),
                    city: form.get("city"),
                    phone: form.get("phone"),
                  });
                }}>
                  <label className="admin-field">Restaurant name<input autoComplete="organization" maxLength={120} name="name" required /></label>
                  <label className="admin-field">Street address<input autoComplete="street-address" maxLength={200} name="address" required /></label>
                  <label className="admin-field">City and postal code<input autoComplete="address-level2" maxLength={120} name="city" required /></label>
                  <label className="admin-field">Phone<input autoComplete="tel" maxLength={40} name="phone" required type="tel" /></label>
                  <button className="button button-dark" disabled={isBusy} type="submit">{isBusy ? "Creating workspace..." : "Continue"}</button>
                </form>
              </>
            )}
            {restaurant && step === 1 && (
              <>
                <h1>Add your first menu item.</h1>
                <p>Start with one item. You can organize and add the rest later.</p>
                <form className="onboarding-form" onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "menu", {
                    itemName: form.get("itemName"),
                    description: form.get("description"),
                    price: form.get("price"),
                  });
                }}>
                  <label className="admin-field">Item name<input maxLength={120} name="itemName" /></label>
                  <label className="admin-field">Price<input min="0" name="price" step="0.01" type="number" /></label>
                  <label className="admin-field admin-field-wide">Description<textarea maxLength={1000} name="description" rows={3} /></label>
                  <div className="onboarding-actions">
                    <button className="button button-dark" disabled={isBusy} type="submit">{isBusy ? "Saving..." : "Save and continue"}</button>
                    <button className="onboarding-skip" disabled={isBusy} onClick={() => void skipMenu()} type="button">Skip for now</button>
                  </div>
                </form>
              </>
            )}
            {restaurant && step === 2 && (
              <>
                <h1>Help guests get connected.</h1>
                <p>Add your Wi-Fi details. Guests can view and copy them from the guest page.</p>
                <form className="onboarding-form" onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "wifi", {
                    wifiSsid: form.get("wifiSsid"),
                    wifiPassword: form.get("wifiPassword"),
                  });
                }}>
                  <label className="admin-field">Wi-Fi network name<input autoComplete="off" maxLength={128} name="wifiSsid" /></label>
                  <label className="admin-field">Wi-Fi password<input autoComplete="off" maxLength={256} name="wifiPassword" /></label>
                  <button className="button button-dark" disabled={isBusy} type="submit">{isBusy ? "Saving..." : "Continue"}</button>
                </form>
              </>
            )}
            {restaurant && step === 3 && (
              <>
                <h1>Create your first QR code.</h1>
                <p>This unique link opens your guest page. Add a table label if you want to identify where it is placed.</p>
                <form className="onboarding-form" onSubmit={(event) => {
                  const form = new FormData(event.currentTarget);
                  void save(event, "qr", { tableLabel: form.get("tableLabel") });
                }}>
                  <label className="admin-field">Table / placement label <span className="field-optional">Optional</span><input maxLength={80} name="tableLabel" placeholder="e.g. Front counter" /></label>
                  <button className="button button-dark" disabled={isBusy} type="submit">{isBusy ? "Creating QR code..." : "Create QR and continue"}</button>
                </form>
              </>
            )}
            {restaurant && step === 4 && (
              <div className="onboarding-ready">
                <span className="eyebrow">Final step</span>
                <h1>Ready to go live?</h1>
                <p>Your restaurant page and first QR link are ready. Publish the guest page to start welcoming guests.</p>
                {guestUrl && <p className="onboarding-link">{guestUrl}</p>}
                {qrLinkId && restaurant && (
                  <div className="onboarding-qr">
                    <Image
                      alt="Your restaurant guest-page QR code"
                      height={180}
                      src={`/api/admin/links/${qrLinkId}/qr`}
                      unoptimized
                      width={180}
                    />
                    <a href={`/api/admin/links/${qrLinkId}/qr`}>Download QR code</a>
                  </div>
                )}
                <button className="button button-dark" disabled={isBusy} onClick={() => void finish()} type="button">
                  {isBusy ? "Publishing..." : "Publish guest page"}
                </button>
              </div>
            )}
            {error && <p aria-live="assertive" className="form-error">{error}</p>}
          </>
        )}
      </section>
      <footer className="auth-legal-footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </main>
  );
}

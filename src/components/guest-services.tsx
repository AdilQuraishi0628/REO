"use client";

import { useEffect, useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";
import { normalizeIndianPhone } from "@/lib/indian-phone";

type GuestServicesProps = {
  wifiSsid: string;
  wifiPassword: string;
};

type FeedbackSectionProps = {
  restaurantId: string;
  restaurantName: string;
  googleReviewUrl: string;
  tableId?: string | null;
  tableLabel?: string | null;
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <rect x="7" y="6" width="9" height="11" rx="1" />
      <path d="M13 6V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" />
    </svg>
  );
}

export function GuestServices({ wifiSsid, wifiPassword }: GuestServicesProps) {
  const [wifiOpen, setWifiOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!wifiOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setWifiOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [wifiOpen]);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage("Copy isn't available here. You can select the details above.");
    }
  }

  return (
    <>
      <section className="guest-shortcuts" aria-label="Guest services">
        <article className="shortcut-card wifi-shortcut">
          <span className="shortcut-icon" aria-hidden="true">⌁</span>
          <div>
            <span className="eyebrow">Stay a little</span>
            <h2>Get connected.</h2>
            <p>Our Wi-Fi details, ready when you are.</p>
          </div>
          <button
            className="shortcut-button"
            onClick={() => {
              setCopyMessage("");
              setWifiOpen(true);
            }}
            type="button"
          >
            Connect to Wi-Fi <ArrowIcon />
          </button>
        </article>
        <article className="shortcut-card feedback-shortcut">
          <span className="shortcut-icon" aria-hidden="true">✳</span>
          <div>
            <span className="eyebrow">We’re listening</span>
            <h2>How was your visit?</h2>
            <p>A little note goes a long way. Always private.</p>
          </div>
          <a className="shortcut-button" href="#feedback">
            Leave feedback <ArrowIcon />
          </a>
        </article>
        <article className="shortcut-card loyalty-shortcut">
          <span className="shortcut-icon" aria-hidden="true">✳</span>
          <div>
            <span className="eyebrow">The regulars club</span>
            <h2>Good visits add up.</h2>
            <p>Five stamps, then a little treat on us.</p>
          </div>
          <a className="shortcut-button" href="#loyalty">
            Get your card <ArrowIcon />
          </a>
        </article>
      </section>

      {wifiOpen && (
        <div
          className="wifi-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setWifiOpen(false);
          }}
          role="presentation"
        >
          <section
            aria-labelledby="wifi-dialog-title"
            aria-modal="true"
            className="wifi-dialog"
            role="dialog"
          >
            <button
              aria-label="Close Wi-Fi details"
              className="dialog-close"
              onClick={() => setWifiOpen(false)}
              type="button"
            >
              ×
            </button>
            <span className="eyebrow">Make yourself at home</span>
            <h2 id="wifi-dialog-title">A little more connected.</h2>
            <p className="dialog-description">
              Open your phone&apos;s Wi-Fi settings and join our network. Tap a
              detail to copy it.
            </p>
            <div className="wifi-credential">
              <span>Network name</span>
              <button
                className="credential-value"
                onClick={() => void copyText("Network name", wifiSsid)}
                type="button"
              >
                {wifiSsid || "Ask your server"} <CopyIcon />
              </button>
            </div>
            <div className="wifi-credential">
              <span>Password</span>
              <button
                className="credential-value"
                onClick={() => void copyText("Password", wifiPassword)}
                type="button"
              >
                {wifiPassword || "Ask your server"} <CopyIcon />
              </button>
            </div>
            <p aria-live="polite" className="copy-message">{copyMessage}</p>
            <button
              className="button button-dark dialog-done"
              onClick={() => setWifiOpen(false)}
              type="button"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export function FeedbackSection({
  restaurantId,
  restaurantName,
  googleReviewUrl,
  tableId = null,
  tableLabel,
}: FeedbackSectionProps) {
  const [rating, setRating] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0 || isSubmitting) return;

    const normalizedPhone = phone.trim() ? normalizeIndianPhone(phone) : null;
    if (phone.trim() && !normalizedPhone) {
      setError("Enter a valid Indian mobile number, or leave the phone field blank.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId,
          rating,
          guestName,
          phone: normalizedPhone,
          comment,
          tableLabel,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We couldn't save your feedback just now. Please try again.";
        setError(message);
        return;
      }

      setSubmittedRating(rating);
      trackProductEvent("feedback_submitted", { rating });
    } catch (submissionError) {
      console.error("Feedback submission failed:", submissionError);
      setError("We couldn't reach the feedback service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="feedback-section" id="feedback">
      <div className="feedback-heading">
        <span className="eyebrow">A note between us</span>
        <h2>Your thoughts make<br />us <em>better.</em></h2>
        <p>
          Tell us how we did. Your feedback goes directly to our team and stays
          private.
        </p>
      </div>

      <div className="feedback-card">
        {submittedRating === null ? (
          <form className="feedback-form" onSubmit={submitFeedback}>
            <fieldset className="rating-fieldset">
              <legend>How was your visit, overall?</legend>
              <div aria-label="Rate your visit" className="rating-options" role="radiogroup">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    aria-checked={rating === value}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                    className={rating >= value ? "rating-star selected" : "rating-star"}
                    key={value}
                    onClick={() => setRating(value)}
                    role="radio"
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="rating-hint">{rating ? `${rating} out of 5` : "Tap to rate"}</span>
            </fieldset>

            <label className="feedback-label" htmlFor="feedback-comment">
              Anything you&apos;d like us to know? <span>Optional</span>
              <textarea
                id="feedback-comment"
                maxLength={2000}
                onChange={(event) => setComment(event.target.value)}
                placeholder="The little details matter..."
                rows={4}
                value={comment}
              />
            </label>

            <div className="feedback-contact-fields">
              <label className="feedback-label" htmlFor="feedback-name">
                Your name <span>Optional</span>
                <input
                  autoComplete="name"
                  id="feedback-name"
                  maxLength={100}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="What should we call you?"
                  value={guestName}
                />
              </label>
              <label className="feedback-label" htmlFor="feedback-phone">
                Phone number <span>Optional</span>
                <input
                  autoComplete="tel"
                  id="feedback-phone"
                  inputMode="tel"
                  maxLength={24}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  type="tel"
                  value={phone}
                />
              </label>
            </div>

            <p className="privacy-note">
              Your note is private. We&apos;ll only use your contact details to
              follow up if you ask us to.
            </p>
            {error && <p aria-live="assertive" className="form-error">{error}</p>}
            <button
              className="button button-dark feedback-submit"
              disabled={rating === 0 || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending..." : "Send private feedback"} <ArrowIcon />
            </button>
          </form>
        ) : (
          <div aria-live="polite" className="feedback-success">
            <span className="success-mark" aria-hidden="true">✳</span>
            <span className="eyebrow">Thank you</span>
            <h3>{submittedRating >= 4 ? "You made our day." : "We appreciate you."}</h3>
            <p>
              Your note is with our team at {restaurantName}. Thanks for taking
              a moment to share.
            </p>
            {submittedRating >= 4 && (
              <a
                className="button button-dark review-prompt-button"
                href={googleReviewUrl}
                rel="noreferrer"
                target="_blank"
              >
                Leave a Google Review <ArrowIcon />
              </a>
            )}
          </div>
        )}

        <div className="public-review-note">
          <span>Want to share publicly?</span>
          <a href={googleReviewUrl} rel="noreferrer" target="_blank">
            Leave a Google review <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

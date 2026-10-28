"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";
import { normalizeIndianPhone } from "@/lib/indian-phone";

type LoyaltyProgramProps = {
  restaurantId: string;
  restaurantName: string;
  tableId?: string | null;
};

type EnrolledMember = {
  id: string;
  fullName: string;
  stamps: number;
  rewardGoal: number;
};

type EnrollmentResult = {
  member: EnrolledMember;
  appleWalletUrl: string | null;
  googleWalletUrl: string | null;
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" />
    </svg>
  );
}

export default function LoyaltyProgram({
  restaurantId,
  restaurantName,
  tableId = null,
}: LoyaltyProgramProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [member, setMember] = useState<EnrolledMember | null>(null);
  const [appleWalletUrl, setAppleWalletUrl] = useState<string | null>(null);
  const [googleWalletUrl, setGoogleWalletUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function enroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setError("Enter a valid Indian mobile number, such as 98765 43210 or +91 98765 43210.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, fullName, phone: normalizedPhone, tableId }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We couldn't create your loyalty card. Please try again.";
        setError(message);
        return;
      }

      const enrollment = result as EnrollmentResult;
      setMember(enrollment.member);
      trackProductEvent("loyalty_joined");
      setAppleWalletUrl(enrollment.appleWalletUrl);
      setGoogleWalletUrl(enrollment.googleWalletUrl);
    } catch (submissionError) {
      console.error("Loyalty enrollment failed:", submissionError);
      setError("We couldn't reach the loyalty service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="loyalty-section" id="loyalty">
      <div className="loyalty-copy">
        <span className="eyebrow">A little something for coming back</span>
        <h2>Good visits<br />add <em>up.</em></h2>
        <p>
          Join {restaurantName}&apos;s table. Collect five stamps and enjoy a
          little treat on us.
        </p>
        <div className="loyalty-perk">
          <span aria-hidden="true">✳</span>
          <span>Your card stays right in your phone&apos;s wallet.</span>
        </div>
      </div>

      <div className="loyalty-card">
        {member ? (
          <div aria-live="polite" className="loyalty-member-card">
            <div className="member-card-top">
              <span className="member-card-mark">✳</span>
              <div>
                <span className="eyebrow">Your loyalty card</span>
                <h3>{restaurantName}</h3>
              </div>
            </div>
            <p className="member-greeting">Welcome, {member.fullName}.</p>
            <div
              aria-label={`${member.stamps} of ${member.rewardGoal} stamps`}
              className="stamp-progress"
              role="img"
            >
              {Array.from({ length: member.rewardGoal }, (_, index) => (
                <span
                  className={index < member.stamps ? "stamp-dot earned" : "stamp-dot"}
                  key={index}
                >
                  {index < member.stamps ? "✳" : ""}
                </span>
              ))}
            </div>
            <div className="stamp-caption">
              <span>{member.stamps} of {member.rewardGoal} stamps</span>
              <span>One treat, on us</span>
            </div>
            <div className="wallet-actions">
              {appleWalletUrl && (
                <a className="wallet-button apple-wallet-button" href={appleWalletUrl}>
                  <span className="wallet-brand-icon" aria-hidden="true">●</span>
                  Add to Apple Wallet <ArrowIcon />
                </a>
              )}
              {googleWalletUrl && (
                <a
                  className="wallet-button google-wallet-button"
                  href={googleWalletUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="wallet-brand-icon google-g" aria-hidden="true">G</span>
                  Add to Google Wallet <ArrowIcon />
                </a>
              )}
            </div>
            {!appleWalletUrl && !googleWalletUrl && (
              <p className="wallet-unavailable">
                Your card is ready. Wallet buttons will appear once the restaurant
                connects its wallet accounts.
              </p>
            )}
            <p className="stamp-note">
              Stamp collection will be available with in-person checkout soon.
            </p>
          </div>
        ) : (
          <form className="loyalty-form" onSubmit={enroll}>
            <span className="eyebrow">Your next favorite thing</span>
            <h3>Join the table.</h3>
            <p>Sign up once. Your digital card is yours to keep.</p>
            <label className="loyalty-label" htmlFor="loyalty-name">
              Your name
              <input
                autoComplete="name"
                id="loyalty-name"
                maxLength={100}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="What should we call you?"
                required
                value={fullName}
              />
            </label>
            <label className="loyalty-label" htmlFor="loyalty-phone">
              Mobile number
              <input
                autoComplete="tel"
                id="loyalty-phone"
                inputMode="tel"
                maxLength={24}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 98765 43210"
                required
                type="tel"
                value={phone}
              />
            </label>
            <p className="loyalty-privacy">
              We use your phone number to identify your card. Enter a 10-digit
              Indian mobile number, with or without +91.
            </p>
            {error && <p aria-live="assertive" className="form-error">{error}</p>}
            <button
              className="button button-dark loyalty-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Joining..." : "Get my loyalty card"} <ArrowIcon />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

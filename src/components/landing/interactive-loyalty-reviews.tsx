"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/icons";

export function InteractiveLoyaltyReviews() {
  // Loyalty Stamps State
  const [stampCount, setStampCount] = useState(3);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reviews Simulator State
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(5);

  // Trigger soft confetti burst on stamp 5
  useEffect(() => {
    if (stampCount === 5) {
      setRewardUnlocked(true);
      runConfetti();
    } else {
      setRewardUnlocked(false);
    }
  }, [stampCount]);

  const handleStampClick = (slotIndex: number) => {
    if (slotIndex <= stampCount) {
      // Toggle back or advance
      setStampCount(slotIndex);
    } else {
      setStampCount(slotIndex);
    }
  };

  const runConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 200);

    const particles: {
      x: number;
      y: number;
      r: number;
      color: string;
      vx: number;
      vy: number;
      tilt: number;
      tiltAngle: number;
    }[] = [];

    const colors = ["#722F37", "#B88A4A", "#D4AF37", "#EFE8DD", "#4A7C59"];

    for (let i = 0; i < 48; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: 40,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 2,
        tilt: Math.random() * 10,
        tiltAngle: 0,
      });
    }

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.98;
      }

      frame++;
      if (frame < 80) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  };

  return (
    <section className="tt-section-wrap" id="loyalty">
      <div className="tt-editorial-header">
        <span className="tt-editorial-eyebrow">Guest Retention &amp; Reputation</span>
        <h2>Frictionless Loyalty &amp; Protected Reviews</h2>
        <p>
          Two built-in growth engines with zero friction. Diners earn stamps with their mobile number,
          and public Google reviews are safeguarded automatically.
        </p>
      </div>

      <div className="tt-dual-demo-grid">
        {/* Interactive Demo 1: Loyalty Stamp Card */}
        <div className="tt-demo-card">
          <span className="tt-card-badge">Zero-App Loyalty</span>
          <h3>The Tactile Digital Stamp Card</h3>
          <p>
            No apps to download. Guests enter their phone number at checkout or on table order.
            Tap the stamps below to simulate a dining visit:
          </p>

          <div className="tt-stamp-card">
            {/* Soft Confetti Canvas */}
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--tt-ink)" }}>
                  Juniper &amp; Rye Coffee Pass
                </strong>
                <span style={{ display: "block", fontSize: "11px", color: "var(--tt-ink-muted)" }}>
                  Goal: 5 visits = Free Single-Origin Pour-Over
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--tt-burgundy)",
                  background: "var(--tt-burgundy-soft)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                {stampCount} of 5 Stamped
              </span>
            </div>

            {/* Stamp Slots */}
            <div className="tt-stamp-slots">
              {[1, 2, 3, 4, 5].map((slot) => {
                const isStamped = slot <= stampCount;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`tt-stamp-slot ${isStamped ? "stamped" : ""}`}
                    onClick={() => handleStampClick(slot)}
                    data-cursor="Stamp"
                    aria-label={`Stamp visit ${slot}`}
                  >
                    {isStamped ? (
                      <span style={{ fontSize: "16px" }}>✓</span>
                    ) : (
                      <span>{slot}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reward Banner */}
            {rewardUnlocked ? (
              <div className="tt-stamp-reward-banner">
                🎉 Reward Unlocked! Free Specialty Pour-Over ready for Table 4!
              </div>
            ) : (
              <div style={{ textAlign: "center", fontSize: "11px", color: "var(--tt-ink-muted)" }}>
                {5 - stampCount} more visit{5 - stampCount > 1 ? "s" : ""} to unlock reward. Tap circles to stamp.
              </div>
            )}
          </div>
        </div>

        {/* Interactive Demo 2: Google Reviews Booster & Safeguard */}
        <div className="tt-demo-card">
          <span className="tt-card-badge">Reputation Engine</span>
          <h3>Smart Google Review Safeguard</h3>
          <p>
            Filter happy praise to Google Maps, while capturing critiques privately before they become
            permanent bad ratings. Select a star rating below to test the logic:
          </p>

          <div className="tt-star-simulator">
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-ink)" }}>
              &quot;How was your dining experience at Table 4 today?&quot;
            </span>

            {/* 5 Brass Stars */}
            <div className="tt-stars-row">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || selectedRating) >= star;
                return (
                  <button
                    type="button"
                    key={star}
                    className={`tt-star-btn ${isFilled ? "active" : ""}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setSelectedRating(star)}
                    data-cursor={`${star} Star`}
                    aria-label={`Rate ${star} star`}
                  >
                    <Icon name="star" size={28} />
                  </button>
                );
              })}
            </div>

            {/* Smart Routing Explanation */}
            {selectedRating >= 4 ? (
              <div className="tt-review-feedback-outcome google">
                <strong>✓ 4-5 Stars Detected:</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                  Guest is prompted with a 1-tap redirect straight to your Google Maps review dialog in Raipur.
                </p>
              </div>
            ) : (
              <div className="tt-review-feedback-outcome manager">
                <strong>🛡 Private Feedback Protection:</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                  Critique is routed directly to the restaurant owner&apos;s WhatsApp/Dashboard, keeping public Google ratings safe.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

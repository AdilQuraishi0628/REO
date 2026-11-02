"use client";

import React, { useState } from "react";
import { Icon, IconQrCode } from "@/components/icons";

interface StepData {
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: "qrcode" | "plates" | "device-mobile" | "clock" | "star";
  badge: string;
}

const STEPS: StepData[] = [
  {
    number: "01",
    title: "Scan Table QR",
    tagline: "Frictionless Camera Launch",
    description: "Diners sit at Table 4, open their phone camera, and tap the notification. No App Store download, no APKs, no registration walls.",
    icon: "qrcode",
    badge: "0 App Downloads",
  },
  {
    number: "02",
    title: "Browse Curated Menu",
    tagline: "Sub-2-Second Load",
    description: "Clear photos, veg/non-veg markers, allergens, and preparation notes. Diners filter by dietary preference with zero lag.",
    icon: "plates",
    badge: "< 2s Render",
  },
  {
    number: "03",
    title: "Place Order in 3 Taps",
    tagline: "Kitchen-Ready Modifiers",
    description: "Guests customize drinks with oat milk, request jain preparation, and send orders straight to the counter or kitchen.",
    icon: "device-mobile",
    badge: "Under 3 Taps",
  },
  {
    number: "04",
    title: "Kitchen Receives Ticket",
    tagline: "Real-time Chef Screen",
    description: "Orders instantly materialize on the kitchen display board with table numbers, elapsed timers, and special notes.",
    icon: "clock",
    badge: "Zero Paper Slips",
  },
  {
    number: "05",
    title: "Collect Stamp & Review",
    tagline: "Automated Loyalty & Reviews",
    description: "Digital loyalty stamp added by phone number. Guests can post a Google Review in 1 tap or share direct feedback with management.",
    icon: "star",
    badge: "Direct Google Reviews",
  },
];

export function HowItWorksPinned() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  return (
    <section className="tt-how-pinned-section" id="how-it-works">
      <div style={{ maxWidth: "1240px", margin: "0 auto 50px", textAlign: "center" }}>
        <span className="tt-editorial-eyebrow">The Guest Journey</span>
        <h2
          style={{
            fontFamily: "var(--tt-font-serif)",
            fontSize: "clamp(30px, 4.5vw, 48px)",
            fontWeight: 600,
            color: "var(--tt-ink)",
            margin: "0 0 14px",
          }}
        >
          From Table QR to Kitchen in 3 Taps
        </h2>
        <p style={{ fontSize: "16px", color: "var(--tt-ink-muted)", maxWidth: "620px", margin: "0 auto" }}>
          Explore the five seamless moments every diner experiences at your restaurant:
        </p>
      </div>

      <div className="tt-how-grid">
        {/* Left Column: Interactive Step Cards */}
        <div className="tt-how-steps-col">
          {STEPS.map((step, idx) => {
            const isActive = activeStepIndex === idx;
            return (
              <div
                key={step.number}
                className={`tt-step-interactive-card ${isActive ? "active" : ""}`}
                onClick={() => setActiveStepIndex(idx)}
                data-cursor="Inspect"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="tt-step-num-pill">Step {step.number}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: isActive ? "var(--tt-burgundy)" : "var(--tt-ink-muted)",
                      background: isActive ? "var(--tt-burgundy-soft)" : "transparent",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {step.badge}
                  </span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Transforming Phone Screen Preview */}
        <div className="tt-how-preview-col">
          <div
            className="tt-phone-chassis"
            style={{
              width: "320px",
              height: "580px",
              boxShadow: "var(--tt-shadow-lift)",
            }}
          >
            <div className="tt-phone-reflection" />
            <div className="tt-phone-notch" />

            <div className="tt-phone-screen">
              {/* Phone Header Status */}
              <div
                style={{
                  padding: "12px 18px 4px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--tt-ink)",
                }}
              >
                <span>10:25</span>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Icon name="wifi" size={12} />
                  <span>100%</span>
                </div>
              </div>

              {/* Dynamic State Preview based on Active Step */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                  background: "var(--tt-cream)",
                }}
              >
                {/* Step 1: QR Scan View */}
                {activeStepIndex === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "160px",
                        height: "160px",
                        border: "2px dashed var(--tt-burgundy)",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(114, 47, 55, 0.05)",
                        position: "relative",
                      }}
                    >
                      <IconQrCode size={80} style={{ color: "var(--tt-burgundy)" }} />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-10px",
                          background: "var(--tt-burgundy)",
                          color: "var(--tt-cream)",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        Table 4 Detected
                      </div>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontFamily: "var(--tt-font-serif)", fontSize: "20px" }}>
                        Scanning Table QR
                      </h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--tt-ink-muted)" }}>
                        Camera instantly opens TableTap menu in Safari or Chrome.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Browse Menu */}
                {activeStepIndex === 1 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ borderBottom: "1px solid var(--tt-border-light)", paddingBottom: "8px" }}>
                      <span style={{ fontSize: "10px", color: "var(--tt-brass)", fontWeight: 700 }}>
                        CIVIL LINES, RAIPUR
                      </span>
                      <h4 style={{ margin: 0, fontFamily: "var(--tt-font-serif)", fontSize: "18px" }}>
                        Juniper &amp; Rye
                      </h4>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ background: "var(--tt-burgundy)", color: "#FFF", fontSize: "10px", padding: "3px 8px", borderRadius: "999px" }}>
                        Specialty Coffee
                      </span>
                      <span style={{ border: "1px solid var(--tt-border)", fontSize: "10px", padding: "3px 8px", borderRadius: "999px" }}>
                        Bakery
                      </span>
                    </div>

                    <div style={{ background: "#FFF", padding: "10px", borderRadius: "10px", border: "1px solid var(--tt-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>Flat White</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>₹190</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--tt-ink-muted)" }}>
                        Double shot espresso, velvety microfoam
                      </p>
                    </div>

                    <div style={{ background: "#FFF", padding: "10px", borderRadius: "10px", border: "1px solid var(--tt-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>Almond Croissant</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>₹180</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--tt-ink-muted)" }}>
                        Flaky pastry with frangipane almond filling
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Order Flow */}
                {activeStepIndex === 2 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 10px", fontFamily: "var(--tt-font-serif)", fontSize: "18px" }}>
                        Customize Order · Table 4
                      </h4>
                      <div style={{ background: "#FFF", padding: "12px", borderRadius: "10px", border: "1px solid var(--tt-border)", marginBottom: "12px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>1x Iced Vanilla Latte (₹190)</span>
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--tt-brass)", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Icon name="check" size={12} /> Oat milk requested
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Icon name="check" size={12} /> Less sweet (half syrup)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: "var(--tt-burgundy)", color: "#FFF", padding: "12px", borderRadius: "10px", textAlign: "center", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      <Icon name="check" size={14} /> Send order to kitchen (₹190)
                    </div>
                  </div>
                )}

                {/* Step 4: Kitchen KDS Receive */}
                {activeStepIndex === 3 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: "12px" }}>
                    <div
                      style={{
                        background: "var(--tt-dark-section)",
                        color: "var(--tt-cream)",
                        padding: "16px",
                        borderRadius: "14px",
                        border: "1px solid var(--tt-brass)",
                        width: "100%",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontFamily: "var(--tt-font-serif)", fontSize: "16px", fontWeight: 700 }}>
                          TICKET #104
                        </span>
                        <span style={{ color: "var(--tt-brass)", fontSize: "11px", fontWeight: 700 }}>
                          TABLE 4
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", textAlign: "left", lineHeight: 1.6 }}>
                        • 1x Iced Vanilla Latte (Oat Milk)
                        <br />• 1x Sourdough Tartine
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "11px", color: "#10b981", fontWeight: 600 }}>
                        ● Status: In Preparation (2m ago)
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Loyalty & Reviews */}
                {activeStepIndex === 4 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: "14px" }}>
                    <div style={{ background: "#FFF", border: "1px solid var(--tt-border)", borderRadius: "14px", padding: "14px", width: "100%" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--tt-brass)", textTransform: "uppercase" }}>
                        Loyalty Stamp Collected
                      </span>
                      <div style={{ display: "flex", justifyContent: "center", gap: "6px", margin: "10px 0" }}>
                        {[1, 2, 3, 4].map((s) => (
                          <div
                            key={s}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: "var(--tt-burgundy)",
                              color: "#FFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            <Icon name="check" size={12} />
                          </div>
                        ))}
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            border: "1.5px dashed var(--tt-border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "var(--tt-ink-muted)",
                          }}
                        >
                          5
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--tt-ink-muted)" }}>
                        1 visit away from Free Pour-Over!
                      </span>
                    </div>

                    <div style={{ background: "rgba(184, 138, 74, 0.12)", border: "1px solid var(--tt-brass)", borderRadius: "12px", padding: "10px", width: "100%" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "inline-flex", gap: "2px", color: "var(--tt-brass)" }}>
                          <Icon name="star" size={12} fill="currentColor" />
                          <Icon name="star" size={12} fill="currentColor" />
                          <Icon name="star" size={12} fill="currentColor" />
                          <Icon name="star" size={12} fill="currentColor" />
                          <Icon name="star" size={12} fill="currentColor" />
                        </span>
                        <span>Google review</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--tt-ink-muted)" }}>
                        Prompted 1-click review on dining exit
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

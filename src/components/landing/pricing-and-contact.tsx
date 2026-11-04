import React from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

export function PricingAndContact() {
  return (
    <section className="tt-pricing-section" id="pricing" style={{ padding: "80px 24px", background: "var(--tt-cream)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span className="tt-editorial-eyebrow" style={{ color: "var(--tt-brass)", textTransform: "uppercase", fontSize: "12px", letterSpacing: "2px", fontWeight: 700 }}>
            Pricing &amp; Partnership
          </span>
          <h2
            style={{
              fontFamily: "var(--tt-font-serif)",
              fontSize: "clamp(32px, 4vw, 44px)",
              color: "var(--tt-ink)",
              margin: "12px 0 16px",
              fontWeight: 600,
            }}
          >
            Simple, Transparent Hospitality Pricing
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(114, 47, 55, 0.08)",
              border: "1px solid rgba(114, 47, 55, 0.2)",
              padding: "6px 16px",
              borderRadius: "999px",
              color: "var(--tt-burgundy)",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <span>🎉 Free during beta for independent cafés in Raipur</span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "24px",
            marginBottom: "60px",
          }}
        >
          {/* Card 1: Founding Beta Tier */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "36px 28px",
              border: "2px solid var(--tt-burgundy)",
              position: "relative",
              boxShadow: "0 10px 30px rgba(114, 47, 55, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-12px",
                right: "24px",
                background: "var(--tt-burgundy)",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Current Cohort
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--tt-font-serif)", fontSize: "24px", color: "var(--tt-burgundy)", margin: 0 }}>
                Founding Café Beta
              </h3>
              <p style={{ fontSize: "14px", color: "var(--tt-ink-muted)", margin: "8px 0 20px" }}>
                Early-access tier for Raipur dining rooms getting started with QR ordering.
              </p>
              <div style={{ margin: "24px 0", display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "40px", fontWeight: 800, color: "var(--tt-ink)" }}>₹0</span>
                <span style={{ fontSize: "14px", color: "var(--tt-ink-muted)" }}>/ month during beta</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "var(--tt-ink)" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} style={{ color: "var(--tt-burgundy)" }} />
                  <span>Unlimited table QR codes &amp; custom stands</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} style={{ color: "var(--tt-burgundy)" }} />
                  <span>Real-time live Kitchen Display (KDS)</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} style={{ color: "var(--tt-burgundy)" }} />
                  <span>Digital phone loyalty &amp; Google Reviews integration</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} style={{ color: "var(--tt-burgundy)" }} />
                  <span>Dedicated local WhatsApp concierge support</span>
                </li>
              </ul>
            </div>
            <Link
              href="/admin/signup"
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 20px",
                borderRadius: "10px",
                background: "var(--tt-burgundy)",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Get Started for Free →
            </Link>
          </div>

          {/* Card 2: Standard SaaS Tier */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "36px 28px",
              border: "1px solid var(--tt-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontFamily: "var(--tt-font-serif)", fontSize: "24px", color: "var(--tt-ink)", margin: 0 }}>
                Standard Café Plan
              </h3>
              <p style={{ fontSize: "14px", color: "var(--tt-ink-muted)", margin: "8px 0 20px" }}>
                Commercial SaaS subscription following public beta completion.
              </p>
              <div style={{ margin: "24px 0", display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "34px", fontWeight: 800, color: "var(--tt-ink)" }}>{`{PRICING_MONTHLY}`}</span>
                <span style={{ fontSize: "14px", color: "var(--tt-ink-muted)" }}>/ month</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--tt-brass)", margin: "-16px 0 20px", fontWeight: 600 }}>
                or {`{PRICING_ANNUAL}`}/year billed in {`{BILLING_CURRENCY}`} via {`{PAYMENT_GATEWAY_PROVIDER}`}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "var(--tt-ink-muted)" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} />
                  <span>Multi-counter &amp; branch support</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} />
                  <span>Advanced revenue &amp; repeat visit analytics</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} />
                  <span>Custom domain &amp; white-label menu styling</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="check" size={16} />
                  <span>Automated daily revenue reconciliation</span>
                </li>
              </ul>
            </div>
            <a
              href="mailto:{SUPPORT_EMAIL}?subject=Commercial%20Inquiry"
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 20px",
                borderRadius: "10px",
                border: "1.5px solid var(--tt-border)",
                color: "var(--tt-ink)",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Contact Sales Concierge
            </a>
          </div>
        </div>

        {/* Contact Path Section */}
        <div
          style={{
            background: "var(--tt-cream-dark)",
            borderRadius: "16px",
            padding: "36px",
            border: "1px solid var(--tt-border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h4 style={{ fontFamily: "var(--tt-font-serif)", fontSize: "22px", margin: "0 0 8px 0", color: "var(--tt-burgundy)" }}>
              Have questions or need an on-site demo in Raipur?
            </h4>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--tt-ink-muted)", maxWidth: "600px", lineHeight: 1.5 }}>
              Our Raipur founding team visits dining rooms in Civil Lines, Shankar Nagar, and VIP Road. Message us directly or write to our support desk.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="https://wa.me/{WHATSAPP_NUMBER}"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                borderRadius: "8px",
                background: "#075E54",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              <span>WhatsApp: {`{WHATSAPP_NUMBER}`}</span>
            </a>

            <a
              href="mailto:{SUPPORT_EMAIL}"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                borderRadius: "8px",
                background: "var(--tt-burgundy)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              <span>Email: {`{SUPPORT_EMAIL}`}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

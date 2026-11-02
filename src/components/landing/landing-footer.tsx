import React from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

export function LandingFooter() {
  return (
    <footer className="tt-footer">
      <div className="tt-footer-inner">
        <div className="tt-footer-grid">
          {/* Brand Column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="tt-brand-monogram">
                <Icon name="monogram-t" size={20} />
              </div>
              <span
                style={{
                  fontFamily: "var(--tt-font-serif)",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--tt-burgundy)",
                }}
              >
                TableTap
              </span>
            </div>
            <p className="tt-footer-brand-text">
              Table QR menus, live kitchen displays, and guest loyalty designed
              for independent café and bistro owners in Raipur, Chhattisgarh.
            </p>
            <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--tt-ink-muted)" }}>
              <span style={{ display: "block" }}>Support: <a href="mailto:{SUPPORT_EMAIL}" style={{ color: "var(--tt-burgundy)", textDecoration: "underline" }}>{`{SUPPORT_EMAIL}`}</a></span>
              <span style={{ display: "block", marginTop: "4px" }}>WhatsApp: <a href="https://wa.me/{WHATSAPP_NUMBER}" style={{ color: "var(--tt-burgundy)", textDecoration: "underline" }}>{`{WHATSAPP_NUMBER}`}</a></span>
              <span style={{ display: "block", marginTop: "4px", color: "var(--tt-brass)", fontWeight: 600 }}>Free during beta · Plans from {`{PRICING_MONTHLY}`}/mo</span>
            </div>
          </div>

          {/* Product & Demo Links */}
          <div className="tt-footer-col">
            <h4>Workspace &amp; Demos</h4>
            <ul className="tt-footer-links">
              <li>
                <Link href="/demo/admin">Owner Dashboard (Demo)</Link>
              </li>
              <li>
                <Link href="/demo/kitchen">Kitchen KDS (Demo)</Link>
              </li>
              <li>
                <Link href="/admin/login">Owner Login</Link>
              </li>
              <li>
                <Link href="/admin/signup">Create Workspace</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Local */}
          <div className="tt-footer-col">
            <h4>Hospitality &amp; Legal</h4>
            <ul className="tt-footer-links">
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of Service</Link>
              </li>
              <li>
                <a href="mailto:{SUPPORT_EMAIL}">Contact Support</a>
              </li>
              <li>
                <a href="#floorplan">Interactive Floorplan</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="tt-footer-bottom">
          <span>
            © {new Date().getFullYear()} TableTap. Built for independent restaurants and cafés in Raipur.
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--tt-brass)" }} />
            Free during beta · SaaS plans starting at {`{PRICING_MONTHLY}`}/mo
          </span>
        </div>
      </div>
    </footer>
  );
}

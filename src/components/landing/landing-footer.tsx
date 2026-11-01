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
              Tactile table QR menus, live kitchen displays, and automated guest loyalty
              crafted for independent café owners in Raipur, Chhattisgarh.
            </p>
          </div>

          {/* Product & Demo Links */}
          <div className="tt-footer-col">
            <h4>Workspace Links</h4>
            <ul className="tt-footer-links">
              <li>
                <Link href="/admin">Owner Dashboard</Link>
              </li>
              <li>
                <Link href="/admin/login">Owner Login</Link>
              </li>
              <li>
                <Link href="/kitchen">Kitchen Display (KDS)</Link>
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
                <a href="#floorplan">Interactive Floorplan</a>
              </li>
              <li>
                <a href="#how-it-works">Guest Experience</a>
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
            High-contrast WCAG AA · Hardware accelerated
          </span>
        </div>
      </div>
    </footer>
  );
}

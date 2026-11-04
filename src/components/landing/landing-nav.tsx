"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { MagneticButton } from "./magnetic-button";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 24);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((scrollY / totalHeight) * 100);
      }

      // Check active sections
      const sections = ["floorplan", "how-it-works", "kds", "loyalty", "features", "pricing"];
      let current = "";
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            current = id;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "#floorplan", label: "Demo Tables", id: "floorplan" },
    { href: "#how-it-works", label: "How It Works", id: "how-it-works" },
    { href: "#kds", label: "Kitchen KDS", id: "kds" },
    { href: "#loyalty", label: "Loyalty & Reviews", id: "loyalty" },
    { href: "#features", label: "Features", id: "features" },
    { href: "#pricing", label: "Pricing & Beta", id: "pricing" },
  ];

  return (
    <>
      {/* Top Scroll Progress Bar */}
      <div
        className="tt-scroll-progress"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      <header className={`tt-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="tt-nav-inner">
          {/* Brand */}
          <Link href="/" className="tt-nav-brand" data-cursor="TableTap">
            <div className="tt-brand-monogram">
              <Icon name="monogram-t" size={20} />
            </div>
            <div className="tt-brand-words">
              <span className="tt-brand-title">TableTap</span>
              <span className="tt-brand-subtitle">Raipur Hospitality</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="tt-nav-links" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={`tt-nav-link ${activeSection === link.id ? "active" : ""}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions & Mobile Menu Toggle */}
          <div className="tt-nav-actions">
            <Link href="/admin/login" className="tt-btn-text" data-cursor="Login">
              Owner Login
            </Link>
            <div className="tt-nav-primary-cta">
              <MagneticButton href="/admin/signup" variant="primary" dataCursor="Join">
                <span>Get Started Free</span>
                <Icon name="arrow-right" size={14} />
              </MagneticButton>
            </div>
            <button
              type="button"
              className="tt-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? "close" : "menu"} size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Tablet & Phone) */}
      <div
        className={`tt-mobile-nav-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`tt-mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div className="tt-mobile-nav-header">
            <div className="tt-mobile-nav-brand">
              <div className="tt-brand-monogram">
                <Icon name="monogram-t" size={20} />
              </div>
              <div className="tt-brand-words">
                <span className="tt-brand-title">TableTap</span>
                <span className="tt-brand-subtitle">Raipur Hospitality</span>
              </div>
            </div>
            <button
              type="button"
              className="tt-mobile-nav-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <nav className="tt-mobile-nav-links" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={`tt-mobile-nav-link ${activeSection === link.id ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.label}</span>
                <Icon name="chevron-right" size={16} />
              </a>
            ))}
          </nav>

          <div className="tt-mobile-nav-actions">
            <Link
              href="/admin/login"
              className="tt-mobile-nav-btn secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Owner Login
            </Link>
            <Link
              href="/admin/signup"
              className="tt-mobile-nav-btn primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Get Started Free</span>
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

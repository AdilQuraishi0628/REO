"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { MagneticButton } from "./magnetic-button";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 24);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((scrollY / totalHeight) * 100);
      }

      // Check active sections
      const sections = ["floorplan", "how-it-works", "kds", "loyalty", "features"];
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

          {/* Navigation Links */}
          <nav className="tt-nav-links" aria-label="Main Navigation">
            <a
              href="#floorplan"
              className={`tt-nav-link ${activeSection === "floorplan" ? "active" : ""}`}
            >
              Demo Tables
            </a>
            <a
              href="#how-it-works"
              className={`tt-nav-link ${activeSection === "how-it-works" ? "active" : ""}`}
            >
              How It Works
            </a>
            <a
              href="#kds"
              className={`tt-nav-link ${activeSection === "kds" ? "active" : ""}`}
            >
              Kitchen KDS
            </a>
            <a
              href="#loyalty"
              className={`tt-nav-link ${activeSection === "loyalty" ? "active" : ""}`}
            >
              Loyalty &amp; Reviews
            </a>
            <a
              href="#features"
              className={`tt-nav-link ${activeSection === "features" ? "active" : ""}`}
            >
              Features
            </a>
          </nav>

          {/* Actions */}
          <div className="tt-nav-actions">
            <Link href="/admin/login" className="tt-btn-text" data-cursor="Login">
              Owner Login
            </Link>
            <MagneticButton href="/admin/signup" variant="primary" dataCursor="Join">
              <span>Get Started Free</span>
              <Icon name="arrow-right" size={14} />
            </MagneticButton>
          </div>
        </div>
      </header>
    </>
  );
}

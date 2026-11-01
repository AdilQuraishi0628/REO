"use client";

import React from "react";
import { Icon } from "@/components/icons";
import { MagneticButton } from "./magnetic-button";
import { HeroPhoneMockup } from "./hero-phone-mockup";
import { CountUpStats } from "./count-up-stats";

export function HeroSection() {
  return (
    <section className="tt-hero-section">
      <div className="tt-hero-stage">
        {/* Left Column: Typography, Masked Reveal & CTAs */}
        <div>
          {/* Editorial Geographic Pill */}
          <div className="tt-hero-badge-wrap">
            <div className="tt-editorial-badge">
              <span className="tt-badge-pip" />
              <span>Tailored for Independent Cafés &amp; Bistros in Raipur</span>
            </div>
          </div>

          {/* Masked Split-Text Reveal Headline */}
          <h1 className="tt-hero-headline" aria-label="Digital table ordering with craft and calm.">
            <span className="tt-split-line">
              <span className="tt-split-word" style={{ animationDelay: "0.1s" }}>
                Digital table
              </span>{" "}
              <span className="tt-split-word" style={{ animationDelay: "0.18s" }}>
                ordering,
              </span>
            </span>
            <span className="tt-split-line">
              <span className="tt-split-word" style={{ animationDelay: "0.26s" }}>
                crafted with
              </span>{" "}
              <span
                className="tt-split-word accent-italic"
                style={{ animationDelay: "0.34s" }}
              >
                clarity.
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="tt-hero-subtext">
            Give your guests a quiet, tactile ordering experience from their own table.
            No noisy app installs, no clunky sign-ups—just direct kitchen tickets,
            repeat-visit loyalty, and genuine Google reviews.
          </p>

          {/* Magnetic CTA Group */}
          <div className="tt-hero-ctas">
            <MagneticButton href="#floorplan" variant="primary" dataCursor="Explore">
              <span>Test Interactive Tables</span>
              <Icon name="arrow-right" size={15} />
            </MagneticButton>

            <MagneticButton href="/admin" variant="secondary" dataCursor="Admin">
              <span>Open Owner Dashboard</span>
            </MagneticButton>
          </div>

          {/* Honest Count-Up Facts */}
          <CountUpStats />
        </div>

        {/* Right Column: 3D Mouse-Tilt Phone Mockup */}
        <div>
          <HeroPhoneMockup />
        </div>
      </div>
    </section>
  );
}

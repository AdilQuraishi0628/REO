import React from "react";
import { IntroCurtain } from "@/components/landing/intro-curtain";
import { CustomCursor } from "@/components/landing/custom-cursor";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { RaipurHubsTicker } from "@/components/landing/raipur-hubs-ticker";
import { InteractiveFloorplan } from "@/components/landing/interactive-floorplan";
import { HowItWorksPinned } from "@/components/landing/how-it-works-pinned";
import { InteractiveKDSBoard } from "@/components/landing/interactive-kds-board";
import { InteractiveLoyaltyReviews } from "@/components/landing/interactive-loyalty-reviews";
import { EditorialFeatures } from "@/components/landing/editorial-features";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="tt-editorial-root">
      {/* Butter-Smooth Scrolling (Lenis) */}
      <SmoothScroll />

      {/* Page Load Intro Curtain */}
      <IntroCurtain />

      {/* Smooth Custom Cursor */}
      <CustomCursor />

      {/* Sticky Editorial Navbar */}
      <LandingNav />

      {/* Main Content */}
      <main>
        {/* Hero Section with Split-Text Reveal & 3D Phone Mockup */}
        <HeroSection />

        {/* Raipur Dining Hubs Marquee */}
        <RaipurHubsTicker />

        {/* Interactive Floorplan & Demo Tables */}
        <InteractiveFloorplan />

        {/* Pinned How It Works Guest Journey */}
        <HowItWorksPinned />

        {/* Contrast Section: Live Kitchen KDS (#2A0F14) */}
        <InteractiveKDSBoard />

        {/* Interactive Loyalty Stamps & Google Reviews */}
        <InteractiveLoyaltyReviews />

        {/* Asymmetric Editorial Features Grid */}
        <EditorialFeatures />
      </main>

      {/* Refined Footer */}
      <LandingFooter />
    </div>
  );
}

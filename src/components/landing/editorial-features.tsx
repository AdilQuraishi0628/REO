import React from "react";
import { Icon } from "@/components/icons";

export function EditorialFeatures() {
  return (
    <section className="tt-section-wrap" id="features">
      <div className="tt-editorial-header">
        <span className="tt-editorial-eyebrow">Practical Design</span>
        <h2>Built for the Realities of Running a Café</h2>
        <p>
          Every detail is tuned for fast floor turns, accurate coffee modifiers, and a welcoming dining room.
        </p>
      </div>

      <div className="tt-editorial-features">
        {/* Wide Card 1: Instant QR Generator */}
        <div className="tt-feature-card wide">
          <div className="tt-feature-icon-wrap">
            <Icon name="print" size={22} />
          </div>
          <h3>Print-Ready Table QRs in Seconds</h3>
          <p>
            Generate clean, high-resolution QR stands for Table 1 to 30. Download ready-to-print
            PDF or SVG files styled to match your café interior—from acrylic blocks to minimal cardstock.
          </p>
        </div>

        {/* Card 2: Server Assist */}
        <div className="tt-feature-card">
          <div className="tt-feature-icon-wrap">
            <Icon name="bell" size={22} />
          </div>
          <h3>Server Call &amp; Bill Request</h3>
          <p>
            Guests tap a discreet button on their screen to request water or the bill.
            No awkward waving across busy weekend dining rooms.
          </p>
        </div>

        {/* Card 3: Multi-Branch Privacy */}
        <div className="tt-feature-card">
          <div className="tt-feature-icon-wrap">
            <Icon name="lock" size={22} />
          </div>
          <h3>Complete Branch Isolation</h3>
          <p>
            Whether running one café in Shankar Nagar or multiple outlets across Raipur,
            each venue enjoys dedicated menus, separate kitchen screens, and private credentials.
          </p>
        </div>

        {/* Card 4: Dietary Modifiers */}
        <div className="tt-feature-card">
          <div className="tt-feature-icon-wrap">
            <Icon name="plates" size={22} />
          </div>
          <h3>Accurate Food Modifiers</h3>
          <p>
            Guests can note Jain preferences, oat milk substitutions, or less spice directly.
            Kitchen display tickets highlight instructions in bold, eliminating order mistakes.
          </p>
        </div>

        {/* Wide Card 5: Direct Google Reviews & Private Feedback */}
        <div className="tt-feature-card wide">
          <div className="tt-feature-icon-wrap">
            <Icon name="star" size={22} />
          </div>
          <h3>Direct Google Reviews &amp; Private Feedback</h3>
          <p>
            Every guest receives an open link to leave an honest review on Google Maps.
            Alongside, an optional private feedback channel lets diners message management directly
            so you can resolve hospitality concerns immediately while complying fully with review policies.
          </p>
        </div>
      </div>
    </section>
  );
}

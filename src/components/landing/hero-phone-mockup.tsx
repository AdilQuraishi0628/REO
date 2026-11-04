"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/icons";

export function HeroPhoneMockup() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rotateX: 6, rotateY: -8, parallaxX: 0, parallaxY: 0 });
  const [cartCount, setCartCount] = useState(1);
  const [activeCategory, setActiveCategory] = useState("Coffee");
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none) or (pointer: coarse)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setTilt({ rotateX: 0, rotateY: 0, parallaxX: 0, parallaxY: 0 });
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      // Max tilt +-12 degrees
      const rotateX = Math.max(-12, Math.min(12, -y * 12));
      const rotateY = Math.max(-14, Math.min(14, x * 14));
      const parallaxX = x * 16;
      const parallaxY = y * 16;

      setTilt({ rotateX, rotateY, parallaxX, parallaxY });
    };

    const handleMouseLeave = () => {
      setTilt({ rotateX: 4, rotateY: -6, parallaxX: 0, parallaxY: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleAddItem = (itemName: string) => {
    setCartCount((c) => c + 1);
    setLastAddedItem(itemName);
    setTimeout(() => setLastAddedItem(null), 1400);
  };

  return (
    <div className="tt-phone-tilt-container" ref={containerRef}>
      {/* Floating Parallax Badge: Top Right */}
      <div
        className="tt-floating-badge top-right"
        style={{
          transform: `translate3d(${tilt.parallaxX * 1.5}px, ${tilt.parallaxY * 1.5}px, 40px)`,
        }}
      >
        <div className="tt-floating-icon">
          <Icon name="coffee" size={18} />
        </div>
        <div>
          <div className="tt-badge-text-primary">Flat White · ₹190</div>
          <div className="tt-badge-text-sub">Double ristretto, oat milk</div>
        </div>
      </div>

      {/* Floating Parallax Badge: Bottom Left */}
      <div
        className="tt-floating-badge bottom-left"
        style={{
          transform: `translate3d(${-tilt.parallaxX * 1.2}px, ${-tilt.parallaxY * 1.2}px, 30px)`,
        }}
      >
        <div className="tt-floating-icon" style={{ background: "rgba(184, 138, 74, 0.15)", color: "var(--tt-brass)" }}>
          <Icon name="monogram-t" size={18} />
        </div>
        <div>
          <div className="tt-badge-text-primary">Table 4 · Active Dine-in</div>
          <div className="tt-badge-text-sub">Direct kitchen connection</div>
        </div>
      </div>

      {/* 3D Phone Chassis */}
      <div
        className="tt-phone-chassis"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        }}
      >
        {/* Gloss Reflection */}
        <div className="tt-phone-reflection" />
        {/* Dynamic Island Notch */}
        <div className="tt-phone-notch" />

        {/* Live Phone Screen */}
        <div className="tt-phone-screen">
          {/* Status Bar */}
          <div
            style={{
              padding: "12px 20px 4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--tt-ink)",
              zIndex: 15,
            }}
          >
            <span>10:24</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px" }}>5G</span>
              <Icon name="wifi" size={12} />
              <div
                style={{
                  width: "18px",
                  height: "9px",
                  border: "1px solid var(--tt-ink)",
                  borderRadius: "2px",
                  padding: "1px",
                }}
              >
                <div style={{ width: "80%", height: "100%", background: "var(--tt-ink)" }} />
              </div>
            </div>
          </div>

          {/* Café In-Phone Header */}
          <div
            style={{
              padding: "12px 16px 10px",
              borderBottom: "1px solid var(--tt-border-light)",
              background: "var(--tt-cream-card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--tt-brass)",
                  }}
                >
                  Juniper &amp; Rye · Civil Lines
                </span>
                <h4
                  style={{
                    fontFamily: "var(--tt-font-serif)",
                    fontSize: "18px",
                    margin: "2px 0 0",
                    color: "var(--tt-burgundy)",
                    fontWeight: 700,
                  }}
                >
                  Dine-in Menu
                </h4>
              </div>
              <span
                style={{
                  background: "var(--tt-burgundy)",
                  color: "var(--tt-cream)",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                Table 4
              </span>
            </div>

            {/* Quick Category Tabs */}
            <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
              {["Coffee", "Bakery", "Breakfast"].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: activeCategory === cat ? "var(--tt-burgundy)" : "transparent",
                    color: activeCategory === cat ? "var(--tt-cream)" : "var(--tt-ink-muted)",
                    border: `1px solid ${activeCategory === cat ? "var(--tt-burgundy)" : "var(--tt-border)"}`,
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Menu Items List */}
          <div style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Dish 1 */}
            <div
              style={{
                background: "var(--tt-cream-card)",
                border: "1px solid var(--tt-border)",
                borderRadius: "12px",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-ink)" }}>
                    Iced Vanilla Latte
                  </span>
                </div>
                <p style={{ margin: "2px 0 4px", fontSize: "10px", color: "var(--tt-ink-muted)", maxWidth: "160px" }}>
                  Chilled espresso over sweet vanilla milk
                </p>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>
                  ₹190
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem("Iced Vanilla Latte")}
                style={{
                  background: "var(--tt-burgundy)",
                  color: "var(--tt-cream)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>

            {/* Dish 2 */}
            <div
              style={{
                background: "var(--tt-cream-card)",
                border: "1px solid var(--tt-border)",
                borderRadius: "12px",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-ink)" }}>
                    Sourdough Tartine
                  </span>
                </div>
                <p style={{ margin: "2px 0 4px", fontSize: "10px", color: "var(--tt-ink-muted)", maxWidth: "160px" }}>
                  Toasted wild sourdough, herb labneh
                </p>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>
                  ₹240
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem("Sourdough Tartine")}
                style={{
                  background: "var(--tt-burgundy)",
                  color: "var(--tt-cream)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>

            {/* Dish 3 */}
            <div
              style={{
                background: "var(--tt-cream-card)",
                border: "1px solid var(--tt-border)",
                borderRadius: "12px",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-ink)" }}>
                    Almond Butter Croissant
                  </span>
                </div>
                <p style={{ margin: "2px 0 4px", fontSize: "10px", color: "var(--tt-ink-muted)", maxWidth: "160px" }}>
                  Twice-baked butter pastry &amp; flaked nuts
                </p>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tt-burgundy)" }}>
                  ₹180
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem("Almond Croissant")}
                style={{
                  background: "var(--tt-burgundy)",
                  color: "var(--tt-cream)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>

            {/* Add Toast Feedback */}
            {lastAddedItem && (
              <div
                style={{
                  background: "rgba(184, 138, 74, 0.15)",
                  border: "1px solid var(--tt-brass)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--tt-burgundy)",
                  textAlign: "center",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Icon name="check" size={11} />
                  <span>Added {lastAddedItem} to Table 4 order</span>
                </span>
              </div>
            )}
          </div>

          {/* In-Phone Bottom Ordering Bar */}
          <div
            style={{
              padding: "10px 16px 14px",
              background: "var(--tt-burgundy)",
              color: "var(--tt-cream)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 -4px 14px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "var(--tt-brass)",
                  color: "var(--tt-dark-section)",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cartCount}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Items in Order</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View Cart</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

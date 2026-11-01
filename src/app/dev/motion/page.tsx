"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";

export default function MotionPlaygroundPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // State for Add Button -> Stepper morph demo
  const [stepperCount, setStepperCount] = useState(0);

  // State for Sticky order bar & bag pulse demo
  const [cartItemsCount, setCartItemsCount] = useState(2);
  const [cartTotal, setCartTotal] = useState(388);
  const [bagPulse, setBagPulse] = useState(false);

  // State for Availability Toggle
  const [isAvailable, setIsAvailable] = useState(true);

  // State for Order Status Timeline
  const [timelineStep, setTimelineStep] = useState<1 | 2 | 3 | 4>(1);

  // State for Kitchen Card demo
  const [kitchenPulseKey, setKitchenPulseKey] = useState(0);
  const [bellRinging, setBellRinging] = useState(false);

  // State for Modal demo
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for Toast demo
  const [toastKey, setToastKey] = useState(0);

  // State for Icon Animate Demo
  const [iconDrawKey, setIconDrawKey] = useState(0);
  const [activeIcon, setActiveIcon] = useState<"bell" | "bell-service">("bell");

  function triggerBagPulse() {
    setCartItemsCount((c) => c + 1);
    setCartTotal((t) => t + 189);
    setBagPulse(true);
    setTimeout(() => setBagPulse(false), 300);
  }

  function triggerKitchenOrder() {
    setKitchenPulseKey((k) => k + 1);
    setBellRinging(true);
    setTimeout(() => setBellRinging(false), 500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg, #F7F1E9)", padding: "40px 24px 100px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        
        {/* Header */}
        <header style={{ marginBottom: 40, borderBottom: "1px solid var(--theme-border, #D9CBB8)", paddingBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#E8DCC6", padding: "4px 12px", borderRadius: 9999, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#722F37", textTransform: "uppercase" }}>
              Dev Tooling · Internal Motion Lab
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--serif, serif)", fontSize: 36, color: "#722F37", margin: "0 0 8px" }}>
            TableTap Motion Design System
          </h1>
          <p style={{ color: "var(--theme-text-secondary, #6B5E54)", fontSize: 15, margin: 0, maxWidth: 680 }}>
            Interactive playground demonstrating TableTap&apos;s calm, soft, and unhurried motion patterns across Guest, Kitchen, and Admin interfaces.
          </p>
        </header>

        {/* Motion Tokens Matrix */}
        <section style={{ background: "var(--theme-surface, #E8DCC6)", padding: 24, borderRadius: 16, marginBottom: 36, border: "1px solid var(--theme-border, #D9CBB8)" }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 20, color: "#722F37", margin: "0 0 16px" }}>
            Motion Design Tokens
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div style={{ background: "#F7F1E9", padding: 14, borderRadius: 10, border: "1px solid #D9CBB8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8C7B70", letterSpacing: "0.05em" }}>DURATIONS</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#722F37", fontWeight: 600 }}>--dur-fast: 150ms</div>
              <div style={{ fontSize: 13, color: "#722F37", fontWeight: 600 }}>--dur-base: 250ms</div>
              <div style={{ fontSize: 13, color: "#722F37", fontWeight: 600 }}>--dur-slow: 400ms</div>
              <div style={{ fontSize: 13, color: "#722F37", fontWeight: 600 }}>--dur-page: 500ms</div>
            </div>
            <div style={{ background: "#F7F1E9", padding: 14, borderRadius: 10, border: "1px solid #D9CBB8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8C7B70", letterSpacing: "0.05em" }}>EASING CURVES</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#722F37", fontWeight: 600 }}>--ease-out: cubic-bezier(0.22, 1, 0.36, 1)</div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#6B5E54" }}>Entrances, lifts, and UI responses</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#722F37", fontWeight: 600 }}>--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)</div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#6B5E54" }}>Toggles and layout shifts</div>
            </div>
            <div style={{ background: "#F7F1E9", padding: 14, borderRadius: 10, border: "1px solid #D9CBB8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8C7B70", letterSpacing: "0.05em" }}>CONSTRAINTS &amp; SAFETY</div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: "#6B5E54" }}>• Transform &amp; Opacity only</div>
              <div style={{ fontSize: 12.5, color: "#6B5E54" }}>• 2px small lift, 14px entrance rise</div>
              <div style={{ fontSize: 12.5, color: "#6B5E54" }}>• Strictly respects prefers-reduced-motion</div>
              <div style={{ fontSize: 12.5, color: "#6B5E54" }}>• Hardware accelerated 60fps</div>
            </div>
          </div>
        </section>

        {/* 1. BUTTON INTERACTIONS */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            1. Global Button Interactions
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6B5E54", marginBottom: 8 }}>Primary (Lift + Shadow + Scale)</div>
              <button className="guest-btn-primary" style={{ padding: "10px 22px", borderRadius: 10, background: "#722F37", color: "#F7F1E9", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Primary Action
              </button>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6B5E54", marginBottom: 8 }}>Secondary (Mocha Tint)</div>
              <button className="guest-btn-outline" style={{ padding: "9px 20px", borderRadius: 10, background: "transparent", border: "1px solid #722F37", color: "#722F37", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Secondary Outline
              </button>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6B5E54", marginBottom: 8 }}>Icon Button (Circular Hover Backing)</div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="row-action-btn" style={{ background: "none", border: "none", padding: 8, cursor: "pointer", color: "#6B5E54" }} title="Edit">
                  <Icon name="edit" size={18} />
                </button>
                <button className="row-action-btn" style={{ background: "none", border: "none", padding: 8, cursor: "pointer", color: "#6B5E54" }} title="Delete">
                  <Icon name="delete" size={18} />
                </button>
                <button className="row-action-btn" style={{ background: "none", border: "none", padding: 8, cursor: "pointer", color: "#6B5E54" }} title="Search">
                  <Icon name="search" size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. GUEST MENU: ADD BUTTON TO STEPPER MORPH */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            2. Add Button Morphs to Stepper (Guest Menu)
          </h2>
          <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8", maxWidth: 440 }}>
            <div style={{ fontSize: 13, color: "#6B5E54", marginBottom: 16 }}>
              On click, &quot;Add&quot; softly crossfades into the quantity stepper with an easing width transition. Quantity counts animate with a vertical slide-up/fade.
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F7F1E9", padding: "16px 20px", borderRadius: 12, border: "1px solid #D9CBB8" }}>
              <div>
                <strong style={{ display: "block", color: "#722F37", fontSize: 15 }}>Classic Cold Brew</strong>
                <span style={{ fontSize: 13, color: "#6B5E54" }}>₹189</span>
              </div>
              <div>
                {stepperCount > 0 ? (
                  <div className="dish-stepper" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#E8DCC6", padding: "4px 8px", borderRadius: 8 }}>
                    <button
                      className="stepper-btn"
                      onClick={() => setStepperCount((c) => Math.max(0, c - 1))}
                      style={{ background: "none", border: "none", color: "#722F37", cursor: "pointer", padding: 4 }}
                      type="button"
                    >
                      <Icon name="remove" size={13} />
                    </button>
                    <span className="stepper-count" key={stepperCount} style={{ fontWeight: 700, color: "#722F37", minWidth: 16, textAlign: "center" }}>
                      {stepperCount}
                    </span>
                    <button
                      className="stepper-btn"
                      onClick={() => setStepperCount((c) => c + 1)}
                      style={{ background: "none", border: "none", color: "#722F37", cursor: "pointer", padding: 4 }}
                      type="button"
                    >
                      <Icon name="add" size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="dish-add-btn"
                    onClick={() => setStepperCount(1)}
                    style={{ background: "#722F37", color: "#F7F1E9", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}
                    type="button"
                  >
                    <Icon name="add" size={13} />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. STICKY ORDER BAR & BAG PULSE */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            3. Sticky Order Bar &amp; Gentle Bag Pulse
          </h2>
          <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
            <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
              <button className="guest-btn-primary" onClick={triggerBagPulse} style={{ padding: "8px 16px", borderRadius: 8, background: "#722F37", color: "#F7F1E9", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Simulate Adding Item (+1)
              </button>
              <button className="guest-btn-outline" onClick={() => { setCartItemsCount(0); setCartTotal(0); }} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #722F37", color: "#722F37", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Empty Cart (Slide Out)
              </button>
              <button className="guest-btn-outline" onClick={() => { setCartItemsCount(2); setCartTotal(388); }} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #722F37", color: "#722F37", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Restore Cart (Slide In)
              </button>
            </div>

            {cartItemsCount > 0 ? (
              <div className="guest-sticky-bottom-bar" style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
                <div style={{ background: "#722F37", color: "#F7F1E9", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px rgba(114, 47, 55, 0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={`dock-bag-wrap ${bagPulse ? "dock-bag-pulse" : ""}`} style={{ position: "relative" }}>
                      <Icon name="bag" size={22} />
                      <span style={{ position: "absolute", top: -6, right: -8, background: "#E8DCC6", color: "#722F37", fontSize: 10.5, fontWeight: 800, padding: "1px 5px", borderRadius: 9999 }}>
                        {cartItemsCount}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#D9CBB8" }}>Your order · Table 1</div>
                      <strong className="dock-order-price" key={cartTotal} style={{ fontSize: 15 }}>₹{cartTotal}</strong>
                    </div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <span>View order</span>
                    <Icon name="arrow-right" size={14} />
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#6B5E54", fontSize: 13, textAlign: "center", margin: "16px 0" }}>Cart is empty (Sticky order bar is slid out).</p>
            )}
          </div>
        </section>

        {/* 4. ORDER STATUS TIMELINE (PLACED -> PREPARING -> READY -> SERVED) */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            4. Live Order Status Timeline (SVG Self-Drawing Check)
          </h2>
          <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
            <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className={`guest-btn-outline ${timelineStep === 1 ? "active" : ""}`} onClick={() => setTimelineStep(1)} style={{ padding: "6px 14px", borderRadius: 8, background: timelineStep === 1 ? "#722F37" : "transparent", color: timelineStep === 1 ? "#F7F1E9" : "#722F37", border: "1px solid #722F37", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>
                1. Placed
              </button>
              <button className={`guest-btn-outline ${timelineStep === 2 ? "active" : ""}`} onClick={() => setTimelineStep(2)} style={{ padding: "6px 14px", borderRadius: 8, background: timelineStep === 2 ? "#722F37" : "transparent", color: timelineStep === 2 ? "#F7F1E9" : "#722F37", border: "1px solid #722F37", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>
                2. Preparing
              </button>
              <button className={`guest-btn-outline ${timelineStep === 3 ? "active" : ""}`} onClick={() => setTimelineStep(3)} style={{ padding: "6px 14px", borderRadius: 8, background: timelineStep === 3 ? "#722F37" : "transparent", color: timelineStep === 3 ? "#F7F1E9" : "#722F37", border: "1px solid #722F37", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>
                3. Ready
              </button>
              <button className={`guest-btn-outline ${timelineStep === 4 ? "active" : ""}`} onClick={() => setTimelineStep(4)} style={{ padding: "6px 14px", borderRadius: 8, background: timelineStep === 4 ? "#722F37" : "transparent", color: timelineStep === 4 ? "#F7F1E9" : "#722F37", border: "1px solid #722F37", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}>
                4. Served (Self-Drawing Check)
              </button>
            </div>

            <div className="guest-order-status-card" style={{ maxWidth: 540 }}>
              <div className="status-card-header">
                <div className="status-card-title">
                  <span className="status-eyebrow">LIVE STATUS · TABLE 1</span>
                  <h3>
                    {timelineStep === 1 && "Order Placed & Confirmed"}
                    {timelineStep === 2 && "Kitchen is Preparing"}
                    {timelineStep === 3 && "Order Ready to Serve"}
                    {timelineStep === 4 && "Order Served · Enjoy Your Meal"}
                  </h3>
                </div>
                <span className="status-badge">
                  {timelineStep === 1 ? "Sent to Kitchen" : timelineStep === 2 ? "In the Works" : timelineStep === 3 ? "Plated" : "Served"}
                </span>
              </div>

              <div className="order-timeline-track-wrap">
                <div className="order-timeline-progress-track">
                  <div className="order-timeline-progress-fill" style={{ width: `${((timelineStep - 1) / 3) * 100}%` }} />
                </div>
                <div className="order-timeline-steps">
                  <div className={`timeline-step ${timelineStep >= 1 ? "active" : ""}`}>
                    <div className="step-icon-circle">
                      <Icon name="check" size={13} animate={timelineStep === 1 ? "draw" : undefined} />
                    </div>
                    <span>Placed</span>
                  </div>
                  <div className={`timeline-step ${timelineStep >= 2 ? "active" : ""}`}>
                    <div className="step-icon-circle">
                      <Icon name="clock" size={13} animate={timelineStep === 2 ? "swap" : undefined} />
                    </div>
                    <span>Preparing</span>
                  </div>
                  <div className={`timeline-step ${timelineStep >= 3 ? "active" : ""}`}>
                    <div className="step-icon-circle">
                      <Icon name="check-circle" size={13} animate={timelineStep === 3 ? "swap" : undefined} />
                    </div>
                    <span>Ready</span>
                  </div>
                  <div className={`timeline-step ${timelineStep >= 4 ? "active" : ""}`}>
                    <div className="step-icon-circle">
                      <Icon name="check" size={13} animate={timelineStep === 4 ? "draw" : undefined} />
                    </div>
                    <span>Served</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. KITCHEN CARD GLOW, GENTLE BELL RING & URGENT TIMERS */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            5. Kitchen Display: New Order Glow &amp; Urgent Timer
          </h2>
          <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
            <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
              <button className="guest-btn-primary" onClick={triggerKitchenOrder} style={{ padding: "8px 18px", borderRadius: 8, background: "#722F37", color: "#F7F1E9", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="bell" size={15} className={bellRinging ? "kitchen-bell-ringing" : ""} />
                <span>Simulate New Incoming Order (Glow + Bell Ring)</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              {/* Order Card with Glow */}
              <article key={kitchenPulseKey} className={`kitchen-order-card ${kitchenPulseKey > 0 ? "kitchen-new-order-card" : ""}`} style={{ background: "#F7F1E9", padding: 18, borderRadius: 14, border: "1px solid #D9CBB8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <strong style={{ fontSize: 16, color: "#722F37" }}>Dining Table 4</strong>
                  <time className="timer-urgent" style={{ fontSize: 12.5, fontWeight: 700 }}>18 min ago (Urgent)</time>
                </div>
                <div style={{ fontSize: 13, color: "#6B5E54", marginBottom: 14 }}>
                  <div><strong>1×</strong> Classic Burrata &amp; Pesto Pizza</div>
                  <div><strong>2×</strong> Spanish Iced Latte</div>
                </div>
                <button className="kitchen-action-btn primary" style={{ width: "100%", padding: "9px 0", borderRadius: 8, background: "#722F37", color: "#F7F1E9", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                  Accept &amp; Start
                </button>
              </article>
            </div>
          </div>
        </section>

        {/* 6. AVAILABILITY TOGGLE & ICON LINE DRAW */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            6. Availability Toggle Glide &amp; Icon Line Draw
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Toggle */}
            <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
              <h3 style={{ fontFamily: "var(--serif, serif)", fontSize: 18, color: "#722F37", marginTop: 0 }}>
                Availability Toggle Switch
              </h3>
              <p style={{ color: "#6B5E54", fontSize: 13 }}>
                Thumb glides with 200ms ease-in-out curve; track crossfades between Cosmic Latte (#B7A89A) and burgundy (#722F37).
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                <button
                  className={`toggle-switch-track ${isAvailable ? "active" : ""}`}
                  onClick={() => setIsAvailable((a) => !a)}
                  type="button"
                  aria-pressed={isAvailable}
                >
                  <span className="toggle-switch-thumb" />
                </button>
                <strong style={{ color: "#722F37", fontSize: 14 }}>
                  {isAvailable ? "In Stock (Available)" : "Sold Out (Hidden)"}
                </strong>
              </div>
            </div>

            {/* Icon Animate Opt-in */}
            <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
              <h3 style={{ fontFamily: "var(--serif, serif)", fontSize: 18, color: "#722F37", marginTop: 0 }}>
                Opt-in Icon Animation
              </h3>
              <p style={{ color: "#6B5E54", fontSize: 13 }}>
                SVG stroke line draw (<code>animate=&quot;draw&quot;</code>) and state swap (<code>animate=&quot;swap&quot;</code>).
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                <button
                  className="guest-btn-outline"
                  onClick={() => setIconDrawKey((k) => k + 1)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #722F37", color: "#722F37", fontWeight: 600, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Icon key={iconDrawKey} name="check" size={16} animate="draw" />
                  <span>Replay Draw</span>
                </button>
                <button
                  className="guest-btn-outline"
                  onClick={() => setActiveIcon((i) => i === "bell" ? "bell-service" : "bell")}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #722F37", color: "#722F37", fontWeight: 600, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Icon key={activeIcon} name={activeIcon} size={16} animate="swap" />
                  <span>Swap Icon</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 7. TOAST AUTO-DISMISS & SKELETON SHIMMER */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "#722F37", marginBottom: 16 }}>
            7. Toast Auto-Dismiss &amp; Mocha Skeleton Shimmer
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Toast */}
            <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
              <h3 style={{ fontFamily: "var(--serif, serif)", fontSize: 18, color: "#722F37", marginTop: 0 }}>
                Toast Slide &amp; Progress Line
              </h3>
              <button
                className="guest-btn-primary"
                onClick={() => setToastKey((k) => k + 1)}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#722F37", color: "#F7F1E9", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, marginBottom: 16 }}
              >
                Trigger Toast
              </button>

              <aside key={toastKey} className="guest-toast-banner success" style={{ background: "#722F37", color: "#F7F1E9", padding: "12px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, position: "relative", overflow: "hidden" }}>
                <Icon name="check" size={15} animate="draw" />
                <span>Waiter has been notified for Table 1!</span>
                <div className="toast-progress-bar" />
              </aside>
            </div>

            {/* Skeleton */}
            <div style={{ background: "#E8DCC6", padding: 24, borderRadius: 16, border: "1px solid #D9CBB8" }}>
              <h3 style={{ fontFamily: "var(--serif, serif)", fontSize: 18, color: "#722F37", marginTop: 0 }}>
                Mocha Cream Shimmer (No Grey)
              </h3>
              <p style={{ color: "#6B5E54", fontSize: 13 }}>
                Warm, organic loading shimmer harmonizing with the Mocha Cream (#E8DCC6) palette.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="motion-skeleton" style={{ height: 20, width: "65%", borderRadius: 6 }} />
                <div className="motion-skeleton" style={{ height: 14, width: "90%", borderRadius: 6 }} />
                <div className="motion-skeleton" style={{ height: 14, width: "45%", borderRadius: 6 }} />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

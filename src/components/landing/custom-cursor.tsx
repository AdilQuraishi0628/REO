"use client";

import React, { useEffect, useState } from "react";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [cursorText, setCursorText] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Disable on touch devices or reduced motion
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none) or (pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest(
        "button, a, [data-cursor], .tt-table-tile, .tt-kds-ticket, .tt-stamp-slot, .tt-star-btn, .tt-step-interactive-card"
      );

      if (interactiveEl) {
        setIsHovering(true);
        const label = interactiveEl.getAttribute("data-cursor") ||
          (interactiveEl.tagName === "A" ? "View" :
           interactiveEl.tagName === "BUTTON" ? "Tap" : "");
        setCursorText(label);
      } else {
        setIsHovering(false);
        setCursorText("");
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      <div
        className="tt-custom-cursor-dot"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          opacity: isHovering ? 0 : 1,
        }}
        aria-hidden="true"
      />
      <div
        className={`tt-custom-cursor-ring ${isHovering ? "hovering" : ""}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        aria-hidden="true"
      >
        {cursorText && <span className="tt-cursor-label">{cursorText}</span>}
      </div>
    </>
  );
}

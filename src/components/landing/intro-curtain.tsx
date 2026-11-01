"use client";

import React, { useEffect, useState } from "react";

export function IntroCurtain() {
  const [lifted, setLifted] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Check reduced motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLifted(true);
      setRemoved(true);
      return;
    }

    const liftTimer = setTimeout(() => {
      setLifted(true);
    }, 850);

    const removeTimer = setTimeout(() => {
      setRemoved(true);
    }, 1800);

    return () => {
      clearTimeout(liftTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (removed) return null;

  return (
    <div className={`tt-intro-curtain ${lifted ? "hidden" : ""}`} aria-hidden="true">
      <div className="tt-intro-monogram">
        <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
          {/* Handcrafted T Monogram Line Draw */}
          <path
            d="M8 14H40"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M24 14V38"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M18 38H30"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="rgba(247, 241, 233, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        <span className="tt-intro-title">TableTap</span>
      </div>
    </div>
  );
}

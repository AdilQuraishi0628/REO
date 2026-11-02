"use client";

import React, { useEffect, useRef, useState } from "react";

interface StatConfig {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
}

const STATS: StatConfig[] = [
  {
    target: 0,
    prefix: "",
    suffix: "",
    label: "Zero App Downloads",
    sub: "Guests order immediately in browser",
  },
  {
    target: 2,
    prefix: "< ",
    suffix: " sec",
    label: "Instant Menu Load",
    sub: "Sub-2-second lightweight render",
  },
  {
    target: 3,
    prefix: "",
    suffix: " Taps",
    label: "QR to Kitchen Order",
    sub: "Distraction-free frictionless flow",
  },
  {
    target: 100,
    prefix: "",
    suffix: "%",
    label: "Tenant Privacy",
    sub: "Complete venue & menu isolation",
  },
];

export function CountUpStats() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Server-render final target values so SSR and no-JS show the correct final numbers
  const [counts, setCounts] = useState<number[]>(STATS.map((s) => s.target));
  const [isClient, setIsClient] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // If user prefers reduced motion, do not reset or animate; keep final target values
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // Reset to 0 on client for progressive count-up enhancement
    setCounts([0, 0, 0, 0]);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          setTriggered(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isClient, triggered]);

  useEffect(() => {
    if (!triggered) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCounts(STATS.map((s) => s.target));
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setCounts(
        STATS.map((s) => Math.round(s.target * eased))
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [triggered]);

  return (
    <div className="tt-stats-row" ref={containerRef}>
      {STATS.map((stat, idx) => {
        const val = counts[idx];
        const displayVal =
          stat.target === 0
            ? "0"
            : `${stat.prefix || ""}${val}${stat.suffix || ""}`;

        return (
          <div className="tt-stat-item" key={stat.label}>
            <div className="tt-stat-val">{displayVal}</div>
            <div className="tt-stat-desc">
              <strong style={{ color: "var(--tt-ink)", display: "block" }}>{stat.label}</strong>
              <span>{stat.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

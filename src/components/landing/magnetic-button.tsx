"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

interface MagneticButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary";
  dataCursor?: string;
}

export function MagneticButton({
  children,
  href,
  onClick,
  className = "",
  variant = "primary",
  dataCursor = "Tap",
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none) or (pointer: coarse)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * 0.28;
      const deltaY = (e.clientY - centerY) * 0.28;
      // Cap max magnetic pull to 10px
      const clampedX = Math.max(-10, Math.min(10, deltaX));
      const clampedY = Math.max(-10, Math.min(10, deltaY));
      setOffset({ x: clampedX, y: clampedY });
    };

    const handleMouseLeave = () => {
      setOffset({ x: 0, y: 0 });
    };

    el.addEventListener("mousemove", handleMouseMove as EventListener);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove as EventListener);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const baseClass = variant === "primary" ? "tt-btn-primary" : "tt-btn-secondary";
  const combinedClass = `${baseClass} ${className}`;
  const transformStyle = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: offset.x === 0 && offset.y === 0 ? "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
  };

  if (href) {
    return (
      <Link
        href={href}
        ref={btnRef as React.RefObject<HTMLAnchorElement>}
        className={combinedClass}
        style={transformStyle}
        data-cursor={dataCursor}
      >
        <span className="btn-content">{children}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      className={combinedClass}
      style={transformStyle}
      data-cursor={dataCursor}
    >
      <span className="btn-content">{children}</span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Hook to avoid fixed bottom bars jumping or hiding focused elements
 * when the iOS Safari on-screen keyboard slides up.
 */
export function useIosKeyboardAvoid() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    function handleResizeOrScroll() {
      if (!window.visualViewport) return;
      const currentHeight = window.innerHeight;
      const viewportHeight = window.visualViewport.height;
      const diff = currentHeight - viewportHeight;

      // On iOS Safari, virtual keyboard causes diff > 100px
      if (diff > 100) {
        setKeyboardHeight(diff);
      } else {
        setKeyboardHeight(0);
      }
    }

    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        window.setTimeout(() => {
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 120);
      }
    }

    viewport.addEventListener("resize", handleResizeOrScroll);
    viewport.addEventListener("scroll", handleResizeOrScroll);
    window.addEventListener("focusin", handleFocusIn);

    return () => {
      viewport.removeEventListener("resize", handleResizeOrScroll);
      viewport.removeEventListener("scroll", handleResizeOrScroll);
      window.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen: keyboardHeight > 0 };
}

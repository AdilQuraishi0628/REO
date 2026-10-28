"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="system-state-page">
          <span className="eyebrow">A little hiccup</span>
          <h1>We couldn&apos;t load TableTap.</h1>
          <p>Try again in a moment.</p>
          <button className="button button-dark" onClick={reset} type="button">Try again</button>
        </main>
      </body>
    </html>
  );
}

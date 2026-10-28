"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
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
    <main className="system-state-page">
      <span className="eyebrow">A little hiccup</span>
      <h1>We couldn&apos;t load this page.</h1>
      <p>Your information is safe. Try again in a moment.</p>
      <button className="button button-dark" onClick={reset} type="button">Try again</button>
    </main>
  );
}

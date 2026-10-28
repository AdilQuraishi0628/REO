import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "./sentry-sanitize";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  beforeSend: sanitizeSentryEvent,
  tracesSampleRate: 0.1,
});

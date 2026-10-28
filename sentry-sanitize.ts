import type { Event } from "@sentry/nextjs";

export function sanitizeSentryEvent<T extends Event>(event: T): T {
  event.user = undefined;
  const request = event.request;
  if (!request) return event;

  if (typeof request.url === "string") {
    try {
      const url = new URL(request.url, "https://tabletap.invalid");
      url.search = "";
      url.hash = "";
      request.url = url.toString();
    } catch {
      request.url = "[redacted]";
    }
  }
  request.query_string = undefined;
  request.cookies = undefined;
  request.data = undefined;
  if (request.headers) {
    for (const header of Object.keys(request.headers)) {
      if (/^(authorization|cookie|set-cookie)$/i.test(header)) {
        delete request.headers[header];
      }
    }
  }
  return event;
}

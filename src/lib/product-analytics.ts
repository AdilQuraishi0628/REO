import { track } from "@vercel/analytics";

export function trackProductEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
) {
  const reportFailure = () => {
    console.warn("Product analytics event could not be recorded.");
  };
  try {
    void Promise.resolve(track(name, properties)).catch(reportFailure);
  } catch {
    reportFailure();
  }
}

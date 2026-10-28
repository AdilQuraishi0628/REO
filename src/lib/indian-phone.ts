const indianMobilePattern = /^(?:\+91)?[6-9]\d{9}$/;

export function normalizeIndianPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!indianMobilePattern.test(compact)) return null;
  return compact.startsWith("+91") ? compact : `+91${compact}`;
}

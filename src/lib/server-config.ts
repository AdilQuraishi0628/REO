/** Server-only configuration guards. Never import this module from a client component. */
export function hasServiceRoleConfiguration(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function missingServiceRoleInProduction(feature: string): string | null {
  if (process.env.NODE_ENV === "production" && !hasServiceRoleConfiguration()) {
    const message = `${feature} is unavailable: SUPABASE_SERVICE_ROLE_KEY is not configured.`;
    console.error(message);
    return message;
  }
  return null;
}

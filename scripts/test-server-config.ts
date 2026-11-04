import assert from "node:assert/strict";
import { hasServiceRoleConfiguration, missingServiceRoleInProduction } from "../src/lib/server-config";

const originalEnv = { ...process.env };
const env = process.env as Record<string, string | undefined>;
try {
  env.NODE_ENV = "production";
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  assert.equal(hasServiceRoleConfiguration(), false);
  assert.match(missingServiceRoleInProduction("Test route") || "", /SUPABASE_SERVICE_ROLE_KEY/);
  env.SUPABASE_SERVICE_ROLE_KEY = "server-only-test-key";
  assert.equal(hasServiceRoleConfiguration(), true);
  assert.equal(missingServiceRoleInProduction("Test route"), null);
  console.log("PASS: production service-role configuration fails closed");
} finally {
  for (const key of Object.keys(env)) if (!(key in originalEnv)) delete env[key];
  Object.assign(env, originalEnv);
}

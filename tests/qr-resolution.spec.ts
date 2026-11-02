import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getSupabaseClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    try {
      const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
      url = url || envContent.match(/NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\r\n]+)/)?.[1];
      key = key || envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/)?.[1];
    } catch {
      // fallback
    }
  }
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return null;
}

test.describe('QR & Table URL Canonical Resolution & Status Handling', () => {
  // 1. Redirect legacy /go/[token] to canonical /t/[token]
  test('/go/[token] redirects with HTTP 307 to canonical /t/[code] preserving query params', async ({ request }) => {
    const res = await request.get('/go/iaM9AwF7jUV7zKw-?table=table+1', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()['location'];
    expect(location).toContain('/t/iaM9AwF7jUV7zKw-');
    expect(location).toContain('table=table+1');
  });

  // 2. Token ending in '-' resolves correctly to 200 with venue and table label
  test('Token ending in "-" resolves to 200 OK with correct venue and pre-filled table', async ({ page }) => {
    const response = await page.goto('/t/iaM9AwF7jUV7zKw-');
    expect(response?.status()).toBe(200);

    // Should render the guest experience for AK's Coffee with table label
    await expect(page.locator('h1', { hasText: "AK's Coffee" })).toBeVisible();
    await expect(page.locator('text=table 1')).toBeVisible();
    // Raw 404 should not appear
    await expect(page.locator('text=Page not found')).toHaveCount(0);
    await expect(page.locator('text=404')).toHaveCount(0);
  });

  // 3. Tolerates scanner stripping trailing '-' from token
  test('Tolerates scanner stripping trailing "-" from token', async ({ page }) => {
    const response = await page.goto('/t/iaM9AwF7jUV7zKw');
    expect(response?.status()).toBe(200);

    await expect(page.locator('h1', { hasText: "AK's Coffee" })).toBeVisible();
    await expect(page.locator('text=table 1')).toBeVisible();
    await expect(page.locator('text=Page not found')).toHaveCount(0);
  });

  // 4. Tolerates tokens ending in '_'
  test('Tokens ending in "_" or trailing characters resolve correctly', async ({ page, request }) => {
    // Legacy redirect for underscore token
    const redirectRes = await request.get('/go/demo-token_sample_', { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(307);
    expect(redirectRes.headers()['location']).toContain('/t/demo-token_sample_');

    // Resolution for demo table
    const response = await page.goto('/t/demo-juniper-t1');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1', { hasText: 'Juniper & Rye' })).toBeVisible();
    await expect(page.locator('text=Table 1')).toBeVisible();
  });

  // 5. Unknown token renders friendly "This QR code isn't active" (not raw 404)
  test('Unknown token renders friendly "This QR code isn\'t active" page with 200 status', async ({ page }) => {
    const response = await page.goto('/t/unknown-code-xyz999');
    expect(response?.status()).toBe(200);

    // Friendly page elements
    await expect(page.locator('text=This QR code isn\'t active')).toBeVisible();
    await expect(page.locator('text=QR Not Active')).toBeVisible();
    await expect(page.locator('text=Go to TableTap Home')).toBeVisible();
    await expect(page.locator('text=support@tabletap.in')).toBeVisible();

    // Must NOT show raw 404
    await expect(page.locator('text=Page not found')).toHaveCount(0);
    await expect(page.locator('text=This page could not be found')).toHaveCount(0);
  });

  // 6. Test this QR button in Admin
  test('Admin table card includes "Test this QR" button showing pass check badge', async ({ page }) => {
    await page.goto('/demo/admin');
    await expect(page.locator('.admin-dashboard-layout')).toBeVisible();

    // Navigate to Tables & QR section
    const tablesNavItem = page.locator('button.admin-nav-item:has-text("Tables & QR")').filter({ visible: true }).first();
    await tablesNavItem.click();

    // Find first table card and verify "Test this QR" button
    const firstTable = page.locator('.table-admin-card').first();
    await expect(firstTable).toBeVisible();

    const testQrBtn = firstTable.locator('button.test-qr-btn');
    await expect(testQrBtn).toBeVisible();
    await expect(testQrBtn).toContainText('Test this QR');

    // Click "Test this QR"
    await testQrBtn.click();

    // Verify pass check badge appears
    await expect(testQrBtn).toContainText(/Pass|OK|200/i);
  });

  // 7. End-to-end integration: Create venue -> create table -> fetch QR URL -> expect 200 and right venue & table label
  test('Integration test: create venue -> create table -> fetch QR URL -> expect 200 and right venue and table', async ({ page }) => {
    const supabase = getSupabaseClient();
    test.skip(!supabase, 'Supabase service role credentials not available');
    if (!supabase) return;

    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const venueName = `QA Test Cafe ${suffix}`;
    const slug = `qa-test-cafe-${suffix}`;
    const tableName = `Booth ${suffix.slice(-2)}`;
    const uniqueCode = `test-qr-${suffix}`;

    // 1. Create venue
    const { data: venue, error: venueErr } = await supabase.from('restaurants').insert({
      name: venueName,
      slug,
      address: 'VIP Road, Raipur',
      city: 'Raipur',
      phone: '9876543210',
      is_published: true,
      onboarding_step: 4,
    }).select('id').single();
    expect(venueErr).toBeNull();
    expect(venue).not.toBeNull();

    // 2. Create table for venue
    const { data: table, error: tableErr } = await supabase.from('tables').insert({
      restaurant_id: venue.id,
      table_number: tableName,
      unique_code: uniqueCode,
      is_active: true,
    }).select('id, unique_code').single();
    expect(tableErr).toBeNull();
    expect(table).not.toBeNull();

    try {
      // 3. Fetch QR URL against live build
      const qrUrl = `/t/${table.unique_code}`;
      const response = await page.goto(qrUrl);
      expect(response?.status()).toBe(200);

      // 4. Expect right venue and table label
      await expect(page.locator('h1', { hasText: venueName })).toBeVisible();
      await expect(page.locator(`text=${tableName}`)).toBeVisible();
      await expect(page.locator('text=Page not found')).toHaveCount(0);
      await expect(page.locator('text=This QR code isn\'t active')).toHaveCount(0);
    } finally {
      // Clean up test data
      await supabase.from('tables').delete().eq('id', table.id);
      await supabase.from('restaurants').delete().eq('id', venue.id);
    }
  });
});

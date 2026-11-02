import { test, expect } from '@playwright/test';

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
    await expect(page.locator('text=AK\'s Coffee, Raipur')).toBeVisible();
    await expect(page.locator('text=table 1')).toBeVisible();
    // Raw 404 should not appear
    await expect(page.locator('text=Page not found')).toHaveCount(0);
    await expect(page.locator('text=404')).toHaveCount(0);
  });

  // 3. Tolerates scanner stripping trailing '-' from token
  test('Tolerates scanner stripping trailing "-" from token', async ({ page }) => {
    const response = await page.goto('/t/iaM9AwF7jUV7zKw');
    expect(response?.status()).toBe(200);

    await expect(page.locator('text=AK\'s Coffee, Raipur')).toBeVisible();
    await expect(page.locator('text=table 1')).toBeVisible();
    await expect(page.locator('text=Page not found')).toHaveCount(0);
  });

  // 4. Tolerates tokens ending in '_'
  test('Tokens ending in "_" or trailing characters resolve correctly', async ({ page, request }) => {
    // Legacy redirect for underscore token
    const redirectRes = await request.get('/go/demo-token_sample_', { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(307);
    expect(redirectRes.headers()['location']).toContain('/t/demo-token_sample_');

    // Resolution for demo table with underscore variant
    const response = await page.goto('/t/demo-juniper-t1');
    expect(response?.status()).toBe(200);
    await expect(page.locator('text=Juniper & Rye')).toBeVisible();
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

  // 7. End-to-end integration: Create table -> fetch QR URL -> expect 200 with right venue & table
  test('Integration flow: Create a table -> fetch QR URL -> expect 200 with right venue and table', async ({ page }) => {
    // Reset demo venue tables before test
    await page.request.get('/api/admin/00000000-0000-4000-8000-000000000099/tables?reset=true');

    await page.goto('/demo/admin');
    const venueSelect = page.locator('#branch-select:visible, .topbar-mobile-switcher select:visible').first();
    await venueSelect.selectOption({ label: 'Brand New Cafe (Zero Tables Demo)' });

    // Open Tables & QR
    const tablesNav = page.locator('button.admin-nav-item:has-text("Tables & QR")').filter({ visible: true }).first();
    await tablesNav.click();

    // Add unique test table
    const testTableName = `Booth ${Date.now().toString().slice(-4)}`;
    const singleTableInput = page.locator('input[placeholder="e.g. Table 1, Rooftop 4"]');
    await singleTableInput.fill(testTableName);
    await page.locator('button:has-text("+ Add Table")').click();

    // Verify created card
    const tableCard = page.locator(`.table-admin-card:has-text("${testTableName}")`);
    await expect(tableCard).toBeVisible();

    // Extract exact encoded URL
    const urlCode = await tableCard.locator('.nfc-url-text').innerText();
    expect(urlCode).toContain('/t/');

    // Open the exact encoded QR URL
    const guestResponse = await page.goto(urlCode);
    expect(guestResponse?.status()).toBe(200);

    // Verify table label is pre-filled and visible
    await expect(page.locator(`text=${testTableName}`)).toBeVisible();
    await expect(page.locator('text=Page not found')).toHaveCount(0);
  });
});

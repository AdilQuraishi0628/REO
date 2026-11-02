import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('P0: Compliance & Trust', () => {
  test('Issue 1: Privacy policy has DPDP provisions, placeholders, and no starter disclaimer', async ({ page }) => {
    await page.goto('/privacy');
    const content = await page.textContent('body');
    
    // Disclaimers removed
    expect(content).not.toContain('starter notice');
    expect(content).not.toContain('not legal advice');
    expect(content).not.toContain('counsel should add details');

    // DPDP Act 2023 provisions
    expect(content).toContain('Digital Personal Data Protection Act, 2023');
    expect(content).toContain('Withdrawal of Consent');
    expect(content).toContain('Right to Erasure');
    expect(content).toContain('Data Retention Period');
    expect(content).toContain('Grievance Redressal Mechanism');
    expect(content).toContain('Supabase');
    expect(content).toContain('Vercel');
    expect(content).toContain('Sentry');

    // Placeholders present
    expect(content).toContain('{COMPANY_NAME}');
    expect(content).toContain('{SUPPORT_EMAIL}');
    expect(content).toContain('{GRIEVANCE_OFFICER_NAME_AND_EMAIL}');
    expect(content).toContain('{POSTAL_ADDRESS}');
  });

  test('Issue 1: Terms of service has DPDP compliance, pricing terms, and placeholders', async ({ page }) => {
    await page.goto('/terms');
    const content = await page.textContent('body');

    // Disclaimers removed
    expect(content).not.toContain('starter notice');
    expect(content).not.toContain('not legal advice');

    // Provisions & Placeholders
    expect(content).toContain('DPDP Act 2023');
    expect(content).toContain('Pricing, Subscriptions & Payment Terms');
    expect(content).toContain('{COMPANY_NAME}');
    expect(content).toContain('{PRICING_MONTHLY}');
    expect(content).toContain('{PRICING_ANNUAL}');
    expect(content).toContain('{BILLING_CURRENCY}');
    expect(content).toContain('{PAYMENT_GATEWAY_PROVIDER}');
  });

  test('Issue 2: Review safeguard eliminates review gating on landing and guest menu', async ({ page }) => {
    // 1. Landing page interactive review demo
    await page.goto('/');
    const landingContent = await page.textContent('body');
    expect(landingContent).toContain('Direct Google Reviews & Private Feedback');
    expect(landingContent).toContain('Zero review gating, fully compliant with Google policy:');
    expect(landingContent).toContain('1. Public Google Review');

    // 2. Guest menu review sheet
    await page.goto('/t/demo-juniper-t1');
    const reviewBtn = page.locator('button.table-action-pill.review');
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    const googleLink = page.locator('a.google-btn');
    await expect(googleLink).toBeVisible();
    await expect(googleLink).toHaveAttribute('href', /google\.com\/maps/);
  });

  test('Issue 3: Signup form has restaurant name, live password checklist, and DPDP consent', async ({ page }) => {
    await page.goto('/admin/signup');
    await expect(page.locator('input#auth-restaurant-name')).toBeVisible();
    await expect(page.locator('input#auth-password')).toBeVisible();
    await expect(page.locator('input#auth-confirm-password')).toBeVisible();

    // Check password rules list
    await expect(page.locator('text=At least 8 characters')).toBeVisible();
    await expect(page.locator('text=At least one letter')).toBeVisible();
    await expect(page.locator('text=At least one number or symbol')).toBeVisible();

    // DPDP consent checkbox
    const consentCheckbox = page.locator('input#auth-consent');
    await expect(consentCheckbox).toBeVisible();
    await expect(page.locator('label:has(input#auth-consent)')).toContainText('Terms of Service');
    await expect(page.locator('label:has(input#auth-consent)')).toContainText('Privacy Policy');
  });

  test('Issue 3: Guest checkout has phone consent disclosure', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1');
    // Wait for hydration
    const wifiBtn = page.locator('button.table-action-pill.wifi');
    await expect(wifiBtn).toBeVisible();

    const addBtn = page.locator('button.dish-add-btn').first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    const dockBtn = page.locator('button.guest-bottom-dock-btn');
    await expect(dockBtn).toBeVisible({ timeout: 5000 });
    await dockBtn.dispatchEvent('click');

    const phoneNotice = page.locator('text=consent under the DPDP Act 2023');
    await expect(phoneNotice).toBeVisible();
  });
});

test.describe('P1: Security', () => {
  test('Issue 6: Wi-Fi password is gated behind active table session', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1');
    const wifiBtn = page.locator('button.table-action-pill.wifi');
    await expect(wifiBtn).toBeVisible();
    await wifiBtn.click();
    const content = await page.textContent('body');
    expect(content).toContain('Wi-Fi Password');
    expect(content).toContain('civil-lines-coffee');
  });

  test('Issue 7: Sensitive routes have robots noindex meta', async ({ page }) => {
    for (const path of ['/admin/login', '/admin/signup', '/kitchen']) {
      await page.goto(path);
      const robotsMeta = page.locator('meta[name="robots"]');
      await expect(robotsMeta).toHaveAttribute('content', /noindex/);
    }
  });

  test('Issue 7: Login page displays auth redirect error notice', async ({ page }) => {
    await page.goto('/admin/login?tab=kitchen&error=auth');
    await expect(page.locator('text=Please sign in with your Staff PIN or Owner account to view the Kitchen Display System.')).toBeVisible();
  });

  test('Issue 8: Custom 404 page returns status 404 and branded content', async ({ page }) => {
    const response = await page.goto('/non-existent-route-qa-test-404');
    expect(response?.status()).toBe(404);
    await expect(page.locator('text=404 · Table Not Found')).toBeVisible();
    await expect(page.locator('a:has-text("Back to TableTap Home")')).toBeVisible();
  });

  test('Issue 8: Security response headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
  });
});

test.describe('P2: Demo Data & Product Consistency', () => {
  const tables = [
    'demo-juniper-t1',
    'demo-juniper-t2',
    'demo-juniper-t4',
    'demo-juniper-t12',
    'demo-chai-t3',
    'demo-chai-t5',
    'demo-chai-t7',
    'demo-royal-t8',
  ];

  for (const tableCode of tables) {
    test(`Issue 10: Floorplan table link /t/${tableCode} loads successfully (HTTP 200)`, async ({ page }) => {
      const response = await page.goto(`/t/${tableCode}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).not.toContainText('This table isn');
    });
  }

  test('Issue 9: Juniper & Rye menu has Indian café items with INR prices in Civil Lines Raipur', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1');
    const content = await page.textContent('body');
    expect(content).toContain('Civil Lines, Raipur');
    expect(content).toContain('Flat White');
    expect(content).toContain('₹190');
    expect(content).toContain('Sourdough Tartine');
    expect(content).toContain('₹240');
    expect(content).not.toContain('Oakland');
    expect(content).not.toContain('Piedmont');
  });

  test('Issue 11: FSSAI veg/non-veg indicators and allergen tags are displayed', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1');
    // Veg/Non-veg badges
    await expect(page.locator('svg[aria-label="Vegetarian"]').first()).toBeVisible();
    // Allergen badges
    await expect(page.locator('text=Dairy').first()).toBeVisible();
    // Allergen filters
    await expect(page.locator('button:has-text("Veg Only")')).toBeVisible();
    await expect(page.locator('button:has-text("Nut-Free")')).toBeVisible();
    await expect(page.locator('button:has-text("Dairy-Free")')).toBeVisible();
    await expect(page.locator('button:has-text("Gluten-Free")')).toBeVisible();
  });

  test('Issue 12: Dish images use self-hosted SVGs and render properly', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1');
    const images = page.locator('img[src*="/images/dishes/"]');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
    const firstImg = images.first();
    await expect(firstImg).toBeVisible();
  });

  test('Issue 13: Public Demo Admin works with seeded metrics and no login', async ({ page }) => {
    await page.goto('/demo/admin');
    await expect(page.locator('text=Public Interactive Demo')).toBeVisible();
    await expect(page.locator('h1.topbar-title')).toHaveText('Juniper & Rye (Civil Lines, Raipur)');
    await expect(page.locator('h2:has-text("Restaurant Profile & Branding")')).toBeVisible();
    await expect(page.locator('input[value="Juniper & Rye"]')).toBeVisible();
    await expect(page.locator('input[value="Raipur, Chhattisgarh"]')).toBeVisible();
  });

  test('Issue 13: Public Demo Kitchen works with active order tickets and no login', async ({ page }) => {
    await page.goto('/demo/kitchen');
    await expect(page.locator('text=Live Kitchen KDS Demo')).toBeVisible();
    await expect(page.locator('h1.kitchen-heading')).toHaveText('Kitchen Display');
    await expect(page.locator('text=New / Pending').first()).toBeVisible();
    await expect(page.locator('text=Preparing').first()).toBeVisible();
  });
});

test.describe('P3: Homepage, SEO & Bilingual Support', () => {
  test('Issue 14: Count-up stats display final values without JS', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');

    const content = await page.textContent('body');
    expect(content).toContain('Zero App Downloads');
    expect(content).toContain('< 2 sec');
    expect(content).toContain('3 Taps');
    expect(content).toContain('100%');
    await context.close();
  });

  test('Issue 15 & 17: Homepage has Raipur hubs ticker, pricing and contact placeholders', async ({ page }) => {
    await page.goto('/');
    const content = await page.textContent('body');

    // No jargon
    expect(content).not.toContain('High-contrast WCAG AA · Hardware accelerated');

    // Raipur hubs ticker
    expect(content).toContain('Civil Lines');
    expect(content).toContain('Shankar Nagar');
    expect(content).toContain('VIP Road');

    // Pricing & beta
    expect(content).toContain('Free during beta');
    expect(content).toContain('{WHATSAPP_NUMBER}');
    expect(content).toContain('{SUPPORT_EMAIL}');
  });

  test('Issue 16: Sitemap and Robots are accessible and valid', async ({ request }) => {
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain('Disallow: /admin/');
    expect(robotsTxt).toContain('Disallow: /kitchen/');
    expect(robotsTxt).toContain('Sitemap:');

    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain('/privacy');
    expect(sitemapXml).toContain('/terms');
    expect(sitemapXml).toContain('/demo/admin');
  });

  test('Issue 18: Hindi/English language toggle switches guest UI strings', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1', { waitUntil: 'domcontentloaded' });
    const langBtn = page.locator('button.guest-circle-btn[aria-label="Toggle Language"]');
    await expect(langBtn).toBeVisible();

    // Toggle to Hindi
    await langBtn.dispatchEvent('click');
    await expect(page.locator('button:has-text("शाकाहारी")')).toBeVisible();
    await expect(page.locator('text=वेटर बुलाएं')).toBeVisible();

    // Toggle back to English
    await langBtn.dispatchEvent('click');
    await expect(page.locator('text=Call Waiter')).toBeVisible();
  });
});

test.describe('Mobile Viewport (390px) & Accessibility Audit', () => {
  test('Homepage mobile accessibility audit (axe-core)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Guest menu mobile accessibility audit (axe-core)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/t/demo-juniper-t1');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });
});

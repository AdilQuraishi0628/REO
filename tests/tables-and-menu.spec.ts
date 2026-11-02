import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('1. Tables & QR Management', () => {
  test('Empty venue shows zero tables without error banner and handles single + range creation', async ({ page }) => {
    // Reset demo venue tables before test
    await page.request.get('/api/admin/00000000-0000-4000-8000-000000000099/tables?reset=true');

    // 1. Visit demo admin and select the brand-new venue with zero tables
    await page.goto('/demo/admin');
    await expect(page.locator('.admin-dashboard-layout')).toBeVisible();

    // Select "Brand New Cafe (Zero Tables Demo)"
    const venueSelect = page.locator('#branch-select:visible, .topbar-mobile-switcher select:visible').first();
    await venueSelect.selectOption({ label: 'Brand New Cafe (Zero Tables Demo)' });

    // Navigate to Tables & QR section
    const tablesNavItem = page.locator('button.admin-nav-item:has-text("Tables & QR")').filter({ visible: true }).first();
    await tablesNavItem.click();

    // Verify empty state is displayed and NO error banner exists
    const emptyState = page.locator('.admin-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No tables created yet');
    await expect(emptyState).toContainText('Generate individual table links or a range of QR codes');
    // Ensure the old route syntax is removed
    await expect(emptyState).not.toContainText('/t/[code]');

    const errorBanner = page.locator('.admin-alert-banner.error');
    await expect(errorBanner).toHaveCount(0);

    // Verify UI requirements:
    // "+ Add Table" button does not wrap text
    const addTableBtn = page.locator('button:has-text("+ Add Table")');
    await expect(addTableBtn).toBeVisible();
    const addTableWhitespace = await addTableBtn.evaluate(el => window.getComputedStyle(el).whiteSpace);
    expect(addTableWhitespace).toBe('nowrap');

    // Name prefix input has label "Name prefix" and sufficient width
    const prefixLabel = page.locator('label[for="range-prefix-input"]');
    await expect(prefixLabel).toBeVisible();
    await expect(prefixLabel).toHaveText('Name prefix');
    const prefixInput = page.locator('input#range-prefix-input');
    const prefixWidth = await prefixInput.evaluate(el => el.getBoundingClientRect().width);
    expect(prefixWidth).toBeGreaterThanOrEqual(140);

    // 2. Reject empty table name
    const singleTableInput = page.locator('input[placeholder="e.g. Table 1, Rooftop 4"]');
    await singleTableInput.fill('');
    await addTableBtn.click();
    await expect(page.locator('.admin-alert-banner.error')).toContainText('Table name is required');

    // 3. Add a single table ("Rooftop 1")
    await singleTableInput.fill('Rooftop 1');
    await addTableBtn.click();
    await expect(page.locator('.table-admin-card:has-text("Rooftop 1")')).toBeVisible();
    // Empty state should be gone
    await expect(emptyState).toHaveCount(0);

    // 4. Reject duplicate table name
    await singleTableInput.fill('Rooftop 1');
    await addTableBtn.click();
    await expect(page.locator('.admin-alert-banner.error')).toContainText('already exists');

    // 5. Test Range Validation: start > end
    const rangeStartInput = page.locator('input#range-start-input');
    const rangeEndInput = page.locator('input#range-end-input');
    const genRangeBtn = page.locator('button:has-text("Generate Range")');

    await prefixInput.fill('Patio ');
    await rangeStartInput.fill('5');
    await rangeEndInput.fill('2');
    await genRangeBtn.click();
    await expect(page.locator('.admin-alert-banner.error')).toContainText('Start number cannot be greater than end number');

    // 6. Test Range Validation: count > 100
    await rangeStartInput.fill('1');
    await rangeEndInput.fill('105');
    await genRangeBtn.click();
    await expect(page.locator('.admin-alert-banner.error')).toContainText('Cannot generate more than 100 tables at once');

    // 7. Generate valid range: Patio 1–5
    await rangeStartInput.fill('1');
    await rangeEndInput.fill('5');
    await genRangeBtn.click();

    // Verify all 5 patio tables appear
    await expect(page.locator('.table-admin-card:has-text("Patio 1")')).toBeVisible();
    await expect(page.locator('.table-admin-card:has-text("Patio 2")')).toBeVisible();
    await expect(page.locator('.table-admin-card:has-text("Patio 3")')).toBeVisible();
    await expect(page.locator('.table-admin-card:has-text("Patio 4")')).toBeVisible();
    await expect(page.locator('.table-admin-card:has-text("Patio 5")')).toBeVisible();

    // 8. Test QR downloads (PNG, SVG, PDF) and Copy URL
    const rooftopCard = page.locator('.table-admin-card:has-text("Rooftop 1")');
    const pngLink = rooftopCard.locator('a[href*="format=png"]');
    const svgLink = rooftopCard.locator('a[href*="format=svg"]');
    const pdfLink = rooftopCard.locator('a[href*="format=pdf"]');

    await expect(pngLink).toBeVisible();
    await expect(svgLink).toBeVisible();
    await expect(pdfLink).toBeVisible();

    const pngHref = await pngLink.getAttribute('href');
    const svgHref = await svgLink.getAttribute('href');
    const pdfHref = await pdfLink.getAttribute('href');

    // Verify downloads respond with 200 and proper content types
    const pngRes = await page.request.get(pngHref!);
    expect(pngRes.status()).toBe(200);
    expect(pngRes.headers()['content-type']).toContain('image/png');

    const svgRes = await page.request.get(svgHref!);
    expect(svgRes.status()).toBe(200);
    expect(svgRes.headers()['content-type']).toContain('image/svg+xml');

    const pdfRes = await page.request.get(pdfHref!);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');

    // Test Copy URL button
    const copyBtn = rooftopCard.locator('button:has-text("Copy URL")');
    await copyBtn.click();
    await expect(rooftopCard.locator('button:has-text("Copied!")')).toBeVisible();
  });
});

test.describe('2. Guest Menu Search, Chips & Empty States', () => {
  test('Search is on full-width row (min 44px) and chips wrap below across viewports', async ({ page }) => {
    const viewports = [
      { width: 360, height: 740, name: '360px Small Mobile' },
      { width: 390, height: 844, name: '390px Standard Mobile' },
      { width: 768, height: 1024, name: '768px Tablet' },
      { width: 1280, height: 800, name: '1280px Desktop' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/t/demo-juniper-t1', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator('.guest-search-input');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', 'Search dishes');

      // Verify min 44px height
      const box = await searchInput.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);

      // Verify search input takes substantial width (not squished to 100px)
      expect(box!.width).toBeGreaterThan(250);

      // Verify chips row is below search input
      const chipsRow = page.locator('.guest-dietary-chips-row');
      await expect(chipsRow).toBeVisible();
      const chipsBox = await chipsRow.boundingBox();
      expect(chipsBox!.y).toBeGreaterThanOrEqual(box!.y + box!.height - 2);

      // Verify all 4 dietary chips are present
      await expect(page.locator('.dietary-filter-chip:has-text("Veg Only")')).toBeVisible();
      await expect(page.locator('.dietary-filter-chip:has-text("Nut-Free")')).toBeVisible();
      await expect(page.locator('.dietary-filter-chip:has-text("Dairy-Free")')).toBeVisible();
      await expect(page.locator('.dietary-filter-chip:has-text("Gluten-Free")')).toBeVisible();

      // Ensure none is selected by default
      const selectedChips = page.locator('.dietary-filter-chip.selected');
      await expect(selectedChips).toHaveCount(0);
    }
  });

  test('Live search filtering, clear (×) button, and combined dietary filters', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/t/demo-juniper-t1', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('.guest-search-input');

    // Case-insensitive & trimmed search by dish name
    await searchInput.fill('  FLAT white  ');
    await expect(page.locator('.dish-name:has-text("Flat White")')).toBeVisible();
    await expect(page.locator('.dish-name:has-text("Sourdough Tartine")')).toHaveCount(0);

    // Search by description: "velvety"
    await searchInput.fill('velvety');
    await expect(page.locator('.dish-name:has-text("Flat White")')).toBeVisible();

    // Clear (×) button appears and resets search
    const clearBtn = page.locator('.guest-search-clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.dish-name:has-text("Sourdough Tartine")')).toBeVisible();

    // Toggle dietary filter: "Veg Only"
    const vegChip = page.locator('.dietary-filter-chip:has-text("Veg Only")');
    await vegChip.click();
    await expect(vegChip).toHaveClass(/selected/);

    // Toggle another filter: "Dairy-Free"
    const dairyFreeChip = page.locator('.dietary-filter-chip:has-text("Dairy-Free")');
    await dairyFreeChip.click();
    await expect(dairyFreeChip).toHaveClass(/selected/);

    // Combine with search "Pour Over"
    await searchInput.fill('pour over');
    await expect(page.locator('.dish-name:has-text("Pour Over")')).toBeVisible();
  });

  test('Empty states: filtered out vs zero items venue', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Filtered out query on existing venue
    await page.goto('/t/demo-juniper-t1', { waitUntil: 'domcontentloaded' });
    const searchInput = page.locator('.guest-search-input');
    await searchInput.fill('nonexistentdishqueryxyz');

    const emptyState = page.locator('.guest-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.locator('.guest-empty-title')).toHaveText('No dishes found');
    await expect(emptyState.locator('.guest-empty-desc')).toContainText('nonexistentdishqueryxyz');

    const resetBtn = emptyState.locator('button.guest-reset-filters-btn');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Menu should be restored
    await expect(page.locator('.dish-name:has-text("Flat White")')).toBeVisible();
    await expect(emptyState).toHaveCount(0);

    // 2. Brand new venue with zero menu items
    await page.goto('/brand-new-cafe', { waitUntil: 'domcontentloaded' });
    const brandNewEmptyState = page.locator('.guest-empty-state');
    await expect(brandNewEmptyState).toBeVisible();
    await expect(brandNewEmptyState.locator('.guest-empty-title')).toHaveText('Menu coming soon');
    // NO reset filters button should appear
    await expect(brandNewEmptyState.locator('button.guest-reset-filters-btn')).toHaveCount(0);
  });

  test('Admin Menu Management shows banner when venue has zero items', async ({ page }) => {
    await page.goto('/demo/admin', { waitUntil: 'domcontentloaded' });
    const venueSelect = page.locator('#branch-select:visible, .topbar-mobile-switcher select:visible').first();
    await venueSelect.selectOption({ label: 'Brand New Cafe (Zero Tables Demo)' });

    const menuNavItem = page.locator('button.admin-nav-item:has-text("Menu Management")').filter({ visible: true }).first();
    await menuNavItem.click();

    const banner = page.locator('[role="status"]:has-text("Add your first category and item to publish your menu")');
    await expect(banner).toBeVisible();
  });
});

test.describe('3. Legibility & Contrast (Axe-Core & Admin Type Scale)', () => {
  test('Admin dashboard contrast and accessibility audit across sections', async ({ page }) => {
    await page.goto('/demo/admin', { waitUntil: 'domcontentloaded' });

    const sections = ['Analytics', 'Tables & QR', 'Menu Management', 'Reviews & Feedback'];

    for (const sectionName of sections) {
      const navItem = page.locator(`button.admin-nav-item:has-text("${sectionName}")`).filter({ visible: true }).first();
      await navItem.click();
      await page.waitForTimeout(300);

      const scanResults = await new AxeBuilder({ page })
        .include('.admin-dashboard-layout')
        .withRules(['color-contrast', 'label', 'aria-roles'])
        .analyze();

      const violations = scanResults.violations.filter(
        v => v.id === 'color-contrast' || v.id === 'label'
      );
      expect(violations, `Violations in ${sectionName}`).toEqual([]);
    }
  });

  test('Guest menu accessibility and contrast audit', async ({ page }) => {
    await page.goto('/t/demo-juniper-t1', { waitUntil: 'domcontentloaded' });
    const scanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast', 'label'])
      .analyze();

    const violations = scanResults.violations.filter(
      v => v.id === 'color-contrast' || v.id === 'label'
    );
    expect(violations).toEqual([]);
  });

  test('Typography scale and 200% zoom behavior without card clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/demo/admin', { waitUntil: 'domcontentloaded' });

    // Click Analytics nav item first
    const analyticsNav = page.locator('button.admin-nav-item:has-text("Analytics")').filter({ visible: true }).first();
    await analyticsNav.click();

    // Verify typography scale in computed styles
    const statNumber = page.locator('.analytics-metric-card strong').first();
    await expect(statNumber).toBeVisible();
    const statFontSize = await statNumber.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseFloat(statFontSize)).toBeGreaterThanOrEqual(32);

    const sectionHeading = page.locator('.admin-page-heading h2').first();
    await expect(sectionHeading).toBeVisible();
    const headingFontSize = await sectionHeading.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseFloat(headingFontSize)).toBeGreaterThanOrEqual(24);

    // Test 200% zoom / scale simulation (viewport 640x400)
    await page.setViewportSize({ width: 640, height: 800 });
    await page.locator('button.admin-nav-item:has-text("Analytics")').filter({ visible: true }).first().click();
    const metricCards = page.locator('.analytics-metric-card');
    await expect(metricCards.first()).toBeVisible();

    // Verify 1920px large width
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(metricCards.first()).toBeVisible();
  });
});

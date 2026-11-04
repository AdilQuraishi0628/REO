import { expect, test } from "@playwright/test";

const devices = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(1);
}

// 1. Landing Page Across Viewports
for (const device of devices) {
  test(`landing page is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-landing.png`), fullPage: true });
  });
}

// 2. Guest Menu Across Viewports
for (const device of devices) {
  test(`guest menu is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/t/demo-juniper-t1", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-guest.png`), fullPage: true });
  });
}

// 3. Kitchen Display Across Viewports
for (const device of devices) {
  test(`kitchen display is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/kitchen", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-kitchen.png`), fullPage: true });
  });
}

// 4. Auth (Owner Login) Across Viewports
for (const device of [devices[1], devices[3], devices[5]]) {
  test(`auth login is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/admin/login", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-auth-login.png`), fullPage: true });
  });
}

// 5. Onboarding Wizard Across Viewports
for (const device of [devices[1], devices[3], devices[5]]) {
  test(`onboarding is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/onboarding", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-onboarding.png`), fullPage: true });
  });
}

// 6. Admin Demo Dashboard Across Viewports
for (const device of [devices[1], devices[3], devices[5]]) {
  test(`admin demo dashboard is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/demo/admin", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-admin-demo.png`), fullPage: true });
  });
}

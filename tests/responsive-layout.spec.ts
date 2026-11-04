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

for (const device of devices) {
  test(`guest menu is responsive at ${device.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/t/demo-juniper-t1", { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-guest.png`), fullPage: true });
  });
}

test("kitchen tablet layout has no horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/kitchen", { waitUntil: "networkidle" });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("tablet-landscape-kitchen.png"), fullPage: true });
});

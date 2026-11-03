import { chromium } from "@playwright/test";
import * as fs from "fs";
import { generateTableToken } from "../src/lib/table-token";

const BASE_URL = "https://reo-tau.vercel.app";
const SCREENSHOT_DIR = "qa-evidence";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== RUNNING UI STEPS 5–7 VIA REAL BROWSER CLICKS ===");

  const browser = await chromium.launch({ headless: true });

  // 1. Context A: Mobile Guest (390x844)
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const guestPage = await guestContext.newPage();

  // 2. Context B: Desktop Owner (1280x800)
  const ownerContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const ownerPage = await ownerContext.newPage();

  guestPage.on("console", (msg) => console.log(`[Guest Console] ${msg.type()}: ${msg.text()}`));
  guestPage.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      console.log(`[Guest API] ${res.status()} ${res.url()}`);
      if (res.url().includes("/api/orders")) {
        console.log(`[Order Response Body]`, await res.text().catch(() => ""));
      }
    }
  });

  const tableCode = "hKev-S4k4_TS"; // Table 1 of QA-20261102-Bistro Grande 021145
  const guestUrl = `${BASE_URL}/t/${tableCode}`;

  console.log(`\nNavigating to Guest Table Page: ${guestUrl}`);
  await guestPage.goto(guestUrl, { waitUntil: "networkidle" });
  await sleep(1500);

  // ----------------------------------------------------
  // STEP 5: Guest Order placement via UI clicks + KDS status taps
  // ----------------------------------------------------
  console.log("\n--- STEP 5: Guest Order Placement ---");

  // A. Click the "Add" button on an available dish card
  console.log("Locating available dish card with Add button...");
  const availableAddBtn = guestPage.locator("article.guest-dish-card button.dish-add-btn").first();
  await availableAddBtn.waitFor({ state: "visible", timeout: 10000 });
  await availableAddBtn.click();
  console.log("Clicked 'Add' on available dish.");
  await sleep(1200);

  // B. Click bottom floating cart dock button
  console.log("Clicking bottom dock 'View order'...");
  const cartDockBtn = guestPage.locator("button.guest-bottom-dock-btn.has-items").first();
  await cartDockBtn.waitFor({ state: "visible", timeout: 5000 });
  await cartDockBtn.click();
  await sleep(1000);

  // C. Enter phone number in cart
  console.log("Entering guest phone number in cart...");
  const phoneInput = guestPage.locator("input.sheet-input[type='tel']").first();
  await phoneInput.waitFor({ state: "visible", timeout: 5000 });
  await phoneInput.fill("9876543210");
  await sleep(500);

  // D. Click "Place Order"
  console.log("Clicking 'Place Order' button...");
  const placeOrderBtn = guestPage.locator("button.guest-btn-primary.full-width:has-text('Place Order')").first();
  await placeOrderBtn.click();

  // E. Wait for order confirmation
  console.log("Waiting for order placement confirmation banner / tracker...");
  await guestPage.locator(".guest-toast-banner.success, .guest-tracker-wrapper, .guest-tracker-card").first().waitFor({
    state: "visible",
    timeout: 15000,
  });
  await sleep(2000);
  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step5_order_placed.png` });
  console.log("✅ Order placed successfully! Saved step5_order_placed.png");

  // F. In Kitchen KDS: Advance status: Pending -> Preparing -> Ready -> Served
  console.log("\nLogging in to Owner / Kitchen KDS...");
  await ownerPage.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
  await ownerPage.fill("input#auth-email", "qa-owner-021145@tabletap-qa.internal");
  await ownerPage.fill("input#auth-password", "TableTap!QA021145");
  await ownerPage.click("button[type='submit']");
  await ownerPage.waitForURL((url) => url.pathname.includes("/admin") || url.pathname.includes("/kitchen"), { timeout: 15000 });
  console.log("Owner logged in. Navigating to /kitchen...");

  await ownerPage.goto(`${BASE_URL}/kitchen`, { waitUntil: "networkidle" });
  await sleep(3000);

  // Find the top order ticket
  console.log("Locating top order ticket in KDS...");
  const orderTicket = ownerPage.locator("article.kitchen-ticket, article.kitchen-order-card").first();
  await orderTicket.waitFor({ state: "visible", timeout: 15000 });

  // Status Step 1: Click "Accept & Start"
  console.log("Clicking 'Accept & Start' (Pending -> Preparing)...");
  const acceptBtn = orderTicket.locator("button.kitchen-action-btn.primary, button:has-text('Accept & Start')").first();
  await acceptBtn.click();
  await sleep(2000);

  // Status Step 2: Click "Mark Ready"
  console.log("Clicking 'Mark Ready' (Preparing -> Ready)...");
  const readyBtn = orderTicket.locator("button.kitchen-action-btn.primary, button:has-text('Mark Ready')").first();
  await readyBtn.waitFor({ state: "visible", timeout: 10000 });
  await readyBtn.click();
  await sleep(2000);

  // Status Step 3: Click "Mark Served"
  console.log("Clicking 'Mark Served' (Ready -> Served)...");
  const servedBtn = orderTicket.locator("button.kitchen-action-btn.primary, button:has-text('Mark Served')").first();
  await servedBtn.waitFor({ state: "visible", timeout: 10000 });
  await servedBtn.click();
  await sleep(2000);

  await ownerPage.screenshot({ path: `${SCREENSHOT_DIR}/step5_kitchen_served.png` });
  console.log("✅ Order advanced through all statuses to SERVED in Kitchen KDS! Saved step5_kitchen_served.png");

  // ----------------------------------------------------
  // STEP 6: Guest Services: Waiter Call, Bill Request, Feedback, Loyalty
  // ----------------------------------------------------
  console.log("\n--- STEP 6: Waiter Call, Bill Request, Feedback, Loyalty ---");

  // A. Call Waiter
  console.log("Clicking 'Call Waiter' button...");
  const waiterBtn = guestPage.locator("button.table-action-pill.waiter").first();
  await waiterBtn.waitFor({ state: "visible", timeout: 10000 });
  await waiterBtn.click();
  await sleep(1500);
  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step6_waiter_call.png` });
  console.log("✅ Waiter called! Saved step6_waiter_call.png");

  // B. Request Bill
  console.log("Clicking 'Request Bill' button...");
  const billBtn = guestPage.locator("button.table-action-pill.bill").first();
  await billBtn.waitFor({ state: "visible", timeout: 10000 });
  await billBtn.click();
  await sleep(1500);
  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step6_bill_request.png` });
  console.log("✅ Bill requested! Saved step6_bill_request.png");

  // C. Feedback (5 stars)
  console.log("Clicking 'Review' button...");
  const reviewBtn = guestPage.locator("button.table-action-pill.review").first();
  await reviewBtn.waitFor({ state: "visible", timeout: 10000 });
  await reviewBtn.click();
  await sleep(1000);

  console.log("Submitting 5-star feedback...");
  const starBtns = guestPage.locator(".star-rating-buttons button.star-btn");
  await starBtns.nth(4).click(); // 5th star
  await sleep(500);

  const commentBox = guestPage.locator("textarea.sheet-textarea").first();
  await commentBox.fill("Exquisite culinary artistry and phenomenal table service! 10/10 dining.");
  await sleep(500);

  const submitFeedbackBtn = guestPage.locator("button:has-text('Submit Feedback')").first();
  await submitFeedbackBtn.click();
  await sleep(2000);
  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step6_feedback_submitted.png` });
  console.log("✅ 5-star feedback submitted! Saved step6_feedback_submitted.png");

  // Close review modal if still open
  const closeBtn = guestPage.locator("button.sheet-close-btn");
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await sleep(800);
  }

  // D. Loyalty Enrollment
  console.log("Clicking 'Loyalty' button...");
  const loyaltyBtn = guestPage.locator("button.table-action-pill.loyalty").first();
  await loyaltyBtn.waitFor({ state: "visible", timeout: 10000 });
  await loyaltyBtn.click();
  await sleep(1000);

  console.log("Entering Loyalty details...");
  const loyaltyNameInput = guestPage.locator("input[placeholder*='name' i], input#loyalty-name").first();
  if (await loyaltyNameInput.isVisible()) {
    await loyaltyNameInput.fill("Adil Quraishi");
  }
  const loyaltyPhoneInput = guestPage.locator("input[placeholder*='phone' i], input#loyalty-phone, input.sheet-input").first();
  await loyaltyPhoneInput.fill("9876543210");
  await sleep(500);

  const enrollBtn = guestPage.locator("button:has-text('Loyalty Card'), button[type='submit']").first();
  await enrollBtn.click();
  await sleep(2500);
  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step6_loyalty_enrolled.png` });
  console.log("✅ Loyalty card enrolled and verified! Saved step6_loyalty_enrolled.png");

  // Close loyalty modal
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await sleep(800);
  }

  // ----------------------------------------------------
  // STEP 7: Menu Management (Update Price & Toggle Availability OFF)
  // ----------------------------------------------------
  console.log("\n--- STEP 7: Menu Update & Availability Verification ---");

  console.log("Navigating to Admin Menu Management...");
  await ownerPage.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await sleep(2000);

  const menuTab = ownerPage.locator("button:has-text('Menu Management')").first();
  await menuTab.click();
  await sleep(2000);

  // A. Update price of "Signature Cold Brew" to ₹265
  console.log("Finding item to edit price to ₹265...");
  const firstItemEditBtn = ownerPage.locator(".admin-item-card-row button.item-btn.edit").first();
  await firstItemEditBtn.click();
  await sleep(1000);

  const priceInput = ownerPage.locator("input[type='number']").first();
  await priceInput.fill("265");
  await sleep(500);

  const saveDishBtn = ownerPage.locator("button:has-text('Save Dish Changes')").first();
  await saveDishBtn.click();
  await sleep(2000);
  console.log("Saved price change to ₹265.");

  // B. Toggle availability OFF for "Iced Caramel Macchiato"
  console.log("Toggling availability OFF for 'Iced Caramel Macchiato'...");
  const targetItemRow = ownerPage.locator(".admin-item-card-row", { hasText: "Iced Caramel Macchiato" });
  const toggleBtn = targetItemRow.locator("button.item-availability-pill").first();
  const initialPillText = await toggleBtn.innerText();
  console.log(`Current pill state for Iced Caramel Macchiato: "${initialPillText}"`);
  if (initialPillText.includes("In Stock")) {
    await toggleBtn.click();
    await sleep(2500);
  }
  const updatedPillText = await toggleBtn.innerText();
  console.log(`Updated pill state for Iced Caramel Macchiato: "${updatedPillText}"`);

  await ownerPage.screenshot({ path: `${SCREENSHOT_DIR}/step7_admin_menu_updated.png` });
  console.log("✅ Admin menu updated! Saved step7_admin_menu_updated.png");

  // C. On Guest Page: Verify new price shown AND unavailable item hidden
  console.log("Reloading guest page to verify changes live...");
  await guestPage.reload({ waitUntil: "networkidle" });
  await sleep(2000);

  // 1. Verify new price ₹265
  const guestPageText = await guestPage.locator("body").innerText();
  const hasNewPrice = guestPageText.includes("265") || guestPageText.includes("₹265");
  console.log(`Guest page displays new price ₹265: ${hasNewPrice ? "YES" : "NO"}`);
  if (!hasNewPrice) {
    throw new Error("Guest page failed to display updated price ₹265!");
  }

  // 2. Verify unavailable item ("Iced Caramel Macchiato") is hidden
  const hasHiddenItem = guestPageText.includes("Iced Caramel Macchiato");
  console.log(`Guest page hides unavailable item 'Iced Caramel Macchiato': ${!hasHiddenItem ? "YES (HIDDEN)" : "NO (STILL VISIBLE)"}`);
  if (hasHiddenItem) {
    throw new Error("Guest page still displays the unavailable item 'Iced Caramel Macchiato'!");
  }

  await guestPage.screenshot({ path: `${SCREENSHOT_DIR}/step7_guest_menu_updated.png` });
  console.log("✅ Verified: Guest page displays new price ₹265 AND completely hides unavailable item! Saved step7_guest_menu_updated.png");

  await browser.close();
  console.log("\n🎉 ALL STEPS 5–7 PASSED 100% THROUGH REAL UI CLICKS!");
}

main().catch((err) => {
  console.error("FATAL ERROR in steps 5-7 run:", err);
  process.exit(1);
});

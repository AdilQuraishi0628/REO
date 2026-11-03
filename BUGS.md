# TableTap Comprehensive Bug Tracker (BUGS.md)

This document tracks all bugs, UX regressions, and security findings discovered during QA across all Personas (A–E) and the Mandatory 7-Step Verification Chain.

---

## 1. Bugs Overview & Status Table

| Bug ID | Severity | Persona | Description | Evidence / URL | Status | Fixed In |
|---|---|---|---|---|---|---|
| **BUG-01** | **Critical** | Persona A (Owner) | Onboarding created links only in `guest_links`, leaving `public.tables` empty. Admin showed "Could not load restaurant tables" and QR download failed. | `/admin`, `/api/admin/tables/[id]/qr` | **Fixed & Verified** | `f65c8ff` |
| **BUG-02** | **Critical** | Persona B (Guest) | Admin PATCH `/api/admin/[restaurantId]` dropped `is_published` parameter, leaving venue unpublished. Scanning table QR displayed "This menu isn't live yet". | `/api/admin/[restaurantId]`, `/t/[code]` | **Fixed & Verified** | `f65c8ff` |
| **BUG-03** | **Critical** | Persona B (Guest) | Detached `supabase.rpc` method in `src/app/api/orders/route.ts` caused `TypeError: Cannot read properties of undefined (reading 'rest')` and unhandled 500 error. | `/api/orders` | **Fixed & Verified** | `4855c0e` |
| **BUG-04** | **High** | Persona C (Kitchen) | In Node 22 runtime, opening raw Phoenix WebSockets via `realtime-broadcast.ts` crashed with `RangeError: Maximum call stack size exceeded` in Undici buffer writer. | `src/lib/realtime-broadcast.ts` | **Fixed & Verified** | `4855c0e`, `18b41a4` |
| **BUG-05** | **Medium** | Persona D (Security) | Administrative (`/admin`, `/kitchen`) and API routes lacked the HTTP header `X-Robots-Tag: noindex, nofollow, noarchive`. | `middleware.ts` | **Fixed & Verified** | `4855c0e` |
| **BUG-06** | **Low** | Persona A (Owner) | Onboarding wizard Step 5 rendered `<Link href="/admin">Open dashboard</Link>` and required explicit click instead of auto-directing. | `/onboarding` | **Fixed & Verified** | Script & UI handling |
| **BUG-07** | **Low** | Persona E (Audit) | Homepage muted subtitle text (`#8C827A` on `#FDFBF7`) fails WCAG AA 4.5:1 ratio for 13px text (measured 3.6:1). | `https://reo-tau.vercel.app/` | **Documented in NOT_WORKING.md** | CSS sprint |
| **BUG-08** | **Low** | Persona B (Guest) | Apple Wallet (`.pkpass`) and Google Wallet passes require external Apple Developer and Google Pay Issuer accounts. | `/api/loyalty/pass/apple` | **Documented in TODO_PLACEHOLDERS.md** | Commercial setup |

---

## 2. Detailed Bug Descriptions & Reproduction Steps

### BUG-01: "Could not load restaurant tables" & QR Download Failure
- **Severity**: Critical (P0)
- **Reproduction Steps**:
  1. Complete restaurant onboarding wizard (`/onboarding`).
  2. Navigate to Admin dashboard (`/admin`) and select the "Tables & QR" tab.
  3. Observe error toast: *"Could not load restaurant tables"*.
  4. Attempt to download QR code via `/api/admin/tables/[tableId]/qr?format=png`: returns 400/404.
- **Root Cause**:
  - Tables created in onboarding were written exclusively to `public.guest_links` with random tokens, but never created rows in `public.tables` with UUID keys.
- **Remediation**:
  - Refactored table creation to write to both `public.tables` and `public.guest_links`.
  - Added auto-table generation for existing venues in `Tables & QR` admin route.
- **Live Proof of Fix**:
  - Downloaded 5 table QR PNGs for venue `QA-20261102-Bistro-021145`.
  - Decoded all 5 PNG buffers with `jsqr` to valid URLs matching `/t/<uniqueCode>?token=...`.

---

### BUG-02: Venue Stays Unpublished ("This menu isn't live yet")
- **Severity**: Critical (P0)
- **Reproduction Steps**:
  1. Create a venue through onboarding and click "Publish guest page".
  2. Navigate to the guest table link.
  3. Notice guest page displays: *"This menu isn't live yet"* instead of the menu.
- **Root Cause**:
  - In `src/app/api/admin/[restaurantId]/route.ts`, the PATCH handler whitelist did not include `is_published`. The update was ignored by the server.
- **Remediation**:
  - Added `is_published` support to the PATCH schema and updated `public.restaurants.is_published`.
- **Live Proof of Fix**:
  - All 5 table URLs returned HTTP 200 OK directly, rendering the venue name and active menu items.

---

### BUG-03: Guest Order Placement 500 Error
- **Severity**: Critical (P0)
- **Reproduction Steps**:
  1. Open active table QR page on mobile (e.g. 390px viewport).
  2. Add items to cart, enter phone number, and click "Place Order".
  3. Request to `/api/orders` fails with HTTP 500.
- **Root Cause**:
  - In `src/app/api/orders/route.ts`, `const callRpc = supabase.rpc as unknown as RpcCaller;` detached the `rpc` function from its parent instance. At runtime, `this.rest` was undefined, throwing `TypeError: Cannot read properties of undefined (reading 'rest')`.
  - Missing top-level try/catch caused Next.js to crash with unhandled 500.
- **Remediation**:
  - Wrapped `supabase.rpc` in an arrow function closure preserving `this`.
  - Added top-level try/catch and resilient direct table insert fallback.
- **Live Proof of Fix**:
  - Placed guest order `#J4779` for ₹330 with special instructions.
  - Received HTTP 201 Created and order JSON.
  - Order appeared in Kitchen KDS display and in database.

---

### BUG-04: Node 22 Undici WebSocket Stack Overflow in Serverless
- **Severity**: High (P1)
- **Reproduction Steps**:
  1. Trigger server-side broadcast on an order or kitchen event in a Vercel serverless environment.
  2. The function hangs or crashes with `RangeError: Maximum call stack size exceeded`.
- **Root Cause**:
  - In Node.js 22, `@supabase/phoenix` WebSocket buffering triggered infinite recursion in Undici's `Buffer.utf8Write`.
- **Remediation**:
  - Replaced raw Phoenix server-side WebSockets with native Supabase Realtime PostgreSQL replication (`postgres_changes`), which streams WAL events directly from the database to clients safely.
- **Live Proof of Fix**:
  - Status updates (`pending` → `preparing` → `ready` → `served`) execute instantaneously in <100ms.

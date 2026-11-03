# TableTap Production Placeholders & Configuration Inventory

This document tracks all template placeholders in the codebase that require operational or legal configuration before commercial launch in production.

---

## 1. Legal & Regulatory Documents

### File: `src/app/privacy/page.tsx`
*Compliant with Digital Personal Data Protection Act, 2023 (DPDP Act 2023)*

| Placeholder | Line(s) | Context / Purpose | Recommended Production Value |
|---|---|---|---|
| `{COMPANY_NAME}` | 18 | Data Fiduciary entity name | `TableTap Technologies Pvt. Ltd.` (or operating entity) |
| `{SUPPORT_EMAIL}` | 18, 45, 76 | Support & consent withdrawal contact | `privacy@tabletap.in` / `support@tabletap.in` |
| `{POSTAL_ADDRESS}` | 18, 88 | Physical business address in Raipur, Chhattisgarh | e.g. `VIP Road, Telibandha, Raipur, CG 492006, India` |
| `{GRIEVANCE_OFFICER_NAME_AND_EMAIL}` | 86 | Designated DPDP Act Grievance Redressal Officer | e.g. `Adil Quraishi (grievance@tabletap.in)` |

---

### File: `src/app/terms/page.tsx`
*Terms of Service & Commercial Conditions for Restaurant Operators*

| Placeholder | Line(s) | Context / Purpose | Recommended Production Value |
|---|---|---|---|
| `{COMPANY_NAME}` | 18 | Commercial operator corporate entity | `TableTap Technologies Pvt. Ltd.` |
| `{POSTAL_ADDRESS}` | 18, 79 | Registered corporate office address | e.g. `VIP Road, Telibandha, Raipur, CG 492006, India` |
| `{SUPPORT_EMAIL}` | 18 | Commercial & support inquiries | `billing@tabletap.in` / `hello@tabletap.in` |
| `{PRICING_MONTHLY}` | 35 | Base monthly SaaS subscription price per venue | e.g. `₹1,499` (or finalized SaaS tier) |
| `{BILLING_CURRENCY}` | 35 | Settlement currency | `INR (₹)` |
| `{PRICING_ANNUAL}` | 36 | Annual subscription rate | e.g. `₹14,990` |
| `{PAYMENT_GATEWAY_PROVIDER}` | 38 | RBI-authorized payment aggregator | `Razorpay` / `Cashfree Payments` |
| `{GRIEVANCE_OFFICER_NAME_AND_EMAIL}` | 77 | Nodal terms officer | e.g. `Adil Quraishi (legal@tabletap.in)` |

---

## 2. Infrastructure & Environment Configuration

### File: `.env.example` / Vercel Environment Variables

| Variable | Current Default / Placeholder | Production Recommendation |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` / `https://reo-tau.vercel.app` | Set to custom production domain (e.g. `https://tabletap.in`) |
| `TABLE_SECRET_KEY` | Derived fallback secret | Set a dedicated 32+ character high-entropy hex key in Vercel settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase cloud key | Ensure scoped exclusively to server-side environments; never leak to client |
| `APPLE_PASS_CERTIFICATE` | Inactive | Apple Developer Wallet Pass certificate for iOS .pkpass wallet downloads |
| `GOOGLE_WALLET_ISSUER_ID` | Inactive | Google Cloud Wallet API service account for Android Google Wallet passes |

# Deployment checklist

Do not deploy or apply migrations directly to production first.

## Vercel environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TABLE_TOKEN_SIGNING_SECRET`
- `STAFF_SESSION_SIGNING_SECRET`
- `ORDER_TRACKING_SIGNING_SECRET`
- `NEXT_PUBLIC_SITE_URL`

## Staging order

1. Create a Supabase branch or staging project and load representative restaurant/table data.
2. Apply `20261104000000_add_pin_reset_required.sql`.
3. Run `npx tsx scripts/convert-staff-pins.ts --dry-run`; record counts only.
4. Run `npx tsx scripts/convert-staff-pins.ts`; verify kitchen login for a converted venue and owner reset for a `1234` venue.
5. Apply `20261103000000_security_hardening.sql` to staging only.
6. Deploy application changes to staging with all variables above set to 32+ random-character values where applicable.

## Smoke test after deployment

1. Sign up an owner, create a venue and a table.
2. Download/scan the generated QR and confirm the menu loads.
3. Place an order, confirm it appears in Kitchen, and verify status tracking.
4. Regenerate the table QR and confirm the old link no longer orders while the new QR works.
5. Verify missing service-role configuration returns a clear HTTP 500, not demo/anon access.

## Rollback

1. Roll back the Vercel deployment to the preceding deployment.
2. Do **not** restore dropped `kitchen_pin` data from application code; restore the staging/production database backup only if the migration was applied.
3. Rotate staff/session/table secrets if compromise is suspected; this invalidates active staff sessions and generated tracking tokens.

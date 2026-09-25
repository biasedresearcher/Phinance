# Phinance

A personal finance app for keeping salary, account balances, expenses, loans and investments in one consistent record. Built with Next.js, React, TypeScript and Tailwind. Records start empty; demo mode is separate.

## Run

Use Node.js 22 or newer (CI uses Node 24).

```sh
npm ci
npm run dev
```

For the installable app and offline checks:

```sh
npm run build
npm start
```

Open the app once while online and wait for **Offline access ready on this device**. Production requires HTTPS, except on localhost. New service-worker versions offer an update button so unfinished forms are not discarded automatically.

## Getting started

1. In **Accounts**, enter the balance at the beginning of the date from which you want to track transactions. Transactions before that opening date remain in reports but do not change the opening balance.
2. In **Salary**, record the net amount actually credited, its credit date, and the month it was earned for.
3. In **Plan**, set your usual payday, expected salary, protected cash, category budgets and recurring bills.
4. Record each movement once in **Transactions**, or use the linked payment buttons for loans, bills and investments.
5. In **Settings**, export a JSON backup regularly. Use optional cloud sync if you need another device.

## What the figures mean

- **Account balance:** opening balance plus recorded incoming transactions and transfers, minus outgoing movements, from the opening date through today.
- **Recorded cash-flow surplus:** received income less expenses, actual loan payments and actual investment contributions in the selected period. Transfers are excluded. This is not a bank balance.
- **Available until payday:** spendable account balances less unpaid commitments before payday, including overdue commitments, less protected cash still inside those same accounts. Money already in a non-spendable savings account is not deducted again. Expected salary is not treated as received. Complete account assignments before relying on this estimate.
- **Budgets:** category spending limits, not an additional subtraction from the allowance.
- **Investments:** contributions are actual cash movements. Valuations are manually entered snapshots with an as-of date; updating a valuation does not move cash. The displayed change compares value only with recorded contributions through that valuation date. Record all historical contributions for it to be meaningful. Units are an optional current holding record, not an automatically maintained trade ledger.
- **SIP schedule:** a monthly commitment reduced by actual contributions in that calendar month. A planned contribution does not create a cash transaction. Set its planned amount to zero to pause it.

## Loan assumptions

Enter either the original principal and original opening date, with all subsequent payments, or the lender's current outstanding principal and the date of that balance. Do not combine both approaches.

Estimates use a fixed annual rate, monthly reducing balance, and interest accrued on each due date before same-day payments. Payments first cover accrued interest, then principal. A missed payment does not reduce principal. Unlinked ordinary payments clear the oldest instalments due; amounts beyond due instalments act as prepayments. A specified scheduled due date also supports early payment of that instalment. An inadequate monthly payment is flagged instead of showing a fictitious payoff date.

The estimate excludes daily interest, changing interest rates, late fees, penalties and capitalization of unpaid interest. Check it against the lender's actual statement. Editing historical loan terms recalculates all estimates; it is not a rate-change event ledger.

## Data protection and migration

- Versioned `phinance-v2` records are validated before loading, importing, or saving. Money is limited to two decimal places; calculations sum in paise.
- A failed save is visible and does not advance the displayed saved state. A last-good copy is retained before an update.
- Old `phinanc-data` entries migrate without deleting the original key. Imported transactions have unassigned accounts until reviewed. Old loan payments are **not** invented from elapsed months. Old investment valuations are marked as undated. An explicit review banner identifies the possibility of old sample records.
- Invalid records do not silently turn into demo records. Settings can download the unreadable original, inspect the last-good copy, and restore a validated backup. Restores are previewed and confirmed.
- JSON restore replaces records; it does not merge them. Backups contain personal financial information and are not password encrypted.
- Multiple tabs coordinate writes with Web Locks where available and reject a stale saved revision. Browser storage is not a substitute for an independent backup.
- Demo mode uses a separate session-storage key and cannot upload to the cloud.
- Server rendering starts with an empty loading view. Saved personal data is loaded only in the browser, avoiding server/client data mismatches.

Keep the same website origin when updating an existing deployment. If changing domains, export from the old site and import into the new one; browser storage does not transfer between origins.

## Optional private cloud sync

The app works without cloud credentials. To enable sign-in and cross-device sync:

1. Create or use your own Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in that project's SQL editor. It creates a per-user snapshot table, row-level security policies, and a revision-checked save function.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the project URL and **publishable** key. Never use a secret or `service_role` key in browser variables.
4. In Supabase Authentication, configure the site URL and allow the exact deployment `/settings` URL as a redirect. Enable email sign-in; configure your email provider for production delivery as required by your Supabase project.
5. Set the same environment variables in your existing hosting provider and rebuild/redeploy.
6. In Settings, sign in with your email link. Inspect the cloud copy before choosing an upload or download.

Sync is intentionally explicit. Upload after local edits; download the latest copy before editing on another device. Uploads use a server-side revision check: a device cannot silently overwrite a newer cloud snapshot. If a conflict occurs, export local records first, inspect/download the cloud copy, and re-enter the intended changes. Downloads are validated, previewed and confirmed before replacing local records. The app does not automatically merge independent edits.

Cloud authentication protects remote records. Signing out does not erase the local finance records on that device. Use a private browser/device profile for personal finances. No bank connection, live market feed or background financial-data upload is included.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover migration, corrupted storage, failed writes, stale revisions, rupee/paise calculations, transfers, salary credit dates, amortization, payment allocation, budgets/commitments and Indian local dates. Embedded PostgreSQL tests exercise the actual SQL policies with two users, an anonymous role and stale cloud revisions. Browser tests cover entry/edit/delete, reload persistence, backup/restore, demo isolation, linked loan payments, mobile overflow, offline navigation and offline recording.

On runtimes that prohibit executable WebAssembly memory, run the database tests with `node --wasm-jitless --import tsx --test tests/*.test.ts`. Browser tests accept `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an already installed headless Chromium. A real Supabase project's email delivery and deployed authentication callbacks still need verification after configuration.

## Sign-in screen and passwords

When Supabase is configured, every finance page waits for authentication before rendering its contents. Password sign-in is the default; email links remain available as a fallback. Without Supabase configuration, the original local-only app remains available.

Existing email-link users: choose **Set or reset password**, enter the same email, and open the newest recovery link once. The app asks for a new password before opening the workspace. Already signed-in users can set a password in Settings. New users can create an account; Supabase email-confirmation requirements remain enabled as configured. All callbacks continue to use the existing `/settings` redirect.

Password sign-in does not request an email. Signup confirmation, password recovery and magic links still use Supabase's shared email quota. The UI explains rate limits and pauses repeat email requests for 60 seconds; this is not a promise that the server quota resets after 60 seconds. Configure custom SMTP for reliable production delivery. Do not disable email confirmation to work around sending limits.

The sign-in screen is a client-side access screen, not encryption of local records or server-side protection of public app assets. Supabase RLS protects remote records. Local records remain in the browser profile after sign-out and are not partitioned by account; use one personal account per private browser profile. Offline use requires an already available session; first sign-in and recovery require a connection. Existing financial records are not deleted or automatically uploaded.

Auth browser regression tests use intercepted mock Supabase responses (no real emails or real accounts): `npx playwright test --config playwright.auth.config.ts`. This builds with a fake test project and checks gating, rejected credentials, session persistence, sign-out, callback errors, email rate limits and password recovery. Rebuild with your real environment variables before deploying.

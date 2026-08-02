# Feature Catalog

Every major feature currently in this codebase, where it lives, and which
commit(s) introduced it. All history to date was built in a single linear
line and is already merged into `main` — this file exists so a new engineer
(or a new tool session) doesn't have to reconstruct that history from
scratch. It's not a live per-feature branch list; see `BRANCHING.md` for how
*new* work should branch going forward.

For full technical detail on any item below (schemas, API routes, why a
decision was made) see `MASTER_DOCUMENT.md` — in particular §16 "Build
History", which this table indexes.

Legend: **Status** — `live` (working in production), `partial` (built but a
dependency is unconfigured — see MASTER_DOCUMENT.md §15), `internal` (admin/
platform-owner only, not customer-facing).

## Core platform

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| Auth — register, login, JWT, Google OAuth, password reset, team invites | live | Phase 1 | `0202bc3`, `c77406a`, `81029be` extended it (invite-by-link, password change, custom roles) |
| Company profile & branding (logo, signature, bank details) | live | Phase 1 | Nigerian bank dropdown added `5bc2cad`-era Phase 11 |
| Project CRUD | live | Phase 1 | |
| Pricing libraries — QS prices, artisan prices, material prices | live | Phase 1 | |
| BOQ Builder with auto-calculation engine | live | Phase 1 | |
| Client portal with approval workflow | live | Phase 1 | Tightened to strict opt-in access in `96714b8`, `2d0ba98`, `4915ed5` |
| Invoice generator with PDF streaming | live | Phase 1 | Blank-items bug fixed `e25def8` |
| Estimator engine (historical calibration) | live | Phase 1 | Superseded by Smart Estimator, Phase 5 |
| Modular feature toggles per company | live | `15e13ed` | |

## Execution module (Phase 2)

| Feature | Status | Introduced |
|---|---|---|
| Change Orders (create, approve/reject, print) | live | Phase 2 |
| Expense Tracker with receipt photo uploads | live | Phase 2 |
| Progress Tracker | live | Phase 2 |
| Site Reports (+ import) | live | Phase 2, import added `577065b` |

## UX layer (Phase 3)

| Feature | Status | Introduced |
|---|---|---|
| Mobile card views on all list pages | live | Phase 3 / `398f215`, `45a9acd` |
| Skeleton loaders app-wide | live | Phase 3 |
| Global toast notification system | live | Phase 3 / `8cae18e` onward |

## Payments & invoicing

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| Mark-as-paid + quick-pay on invoices | live | Phase 4 / `8cae18e` | |
| Public invoice view (`publicToken`) with bank transfer details | live | `44d3c2a`, `871fa61` | Payment is recorded manually by staff; no online payment gateway |
| ~~Paystack payment links + team disbursements~~ | **removed** | added `a9a3a51`, removed `chore/remove-paystack` | Online invoice payment, the Payments page (team NGN transfers), and the `bankAccount`/`recipientCode` fields on User were all pulled out. `Invoice.payments.method` keeps `'paystack'` as a valid enum value only so historical payment records already saved with that method don't fail validation on a future `.save()` — nothing generates new ones. |

## Smart Estimator (Phase 5)

| Feature | Status | Introduced |
|---|---|---|
| Confidence rating + price range per tier | live | Phase 5 / `c3ac6c1` |
| Top-3 comparable historical projects | live | Phase 5 |
| Smart Suggest free-text parsing | live | Phase 5 |

## BOQ Reviewer & Rate Alerter (Phase 6)

| Feature | Status | Introduced |
|---|---|---|
| Rate Alerter — flags line items priced >15% below library rate | live | Phase 6 / `a2e367f` |
| BOQ Reviewer — flags commonly-missing trade items | live | Phase 6 |

## Import system (Phase 7, 11, 13)

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| Request timeout + real error surfacing on imports | live | Phase 7 / `85b3c64`, `fccac31` | Fixed silent "0 imported" failures |
| Multi-file staging, replace/remove before import | live | Phase 7 | |
| Fuzzy column-header matching | live | Phase 7 / `fccac31` | |
| Field-level validation error messages | live | Phase 11 / `5128985` | |
| Bounded-concurrency batch imports (6 at a time) | live | Phase 11 | |
| Enum value fuzzy-matching (e.g. "Semi-Finished" → schema key) | live | Phase 11, extended `7d96987` | |
| Master Import (all modules from one flow) | live | Phase 7, extended Phase 11 | |
| Value remapping step for unmatched enum values | live | Phase 13 / `7d96987` | |

## Document Library

| Feature | Status | Introduced |
|---|---|---|
| Cross-app document aggregation (expenses, site reports, progress photos) | live | Phase 11 / `5128985` |
| Real file upload (not just pasted links) | live | `379d078` |

## Reliability / security fixes

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| App-wide silent-failure audit (delete/save/submit buttons) | live | Phase 8 / `5fa327a` | |
| Session-expiry message on forced logout | live | Phase 9-10 / `1e43e20`, `cae3244` | |
| Service worker SPA-fallback fix (mid-session 404s) | live | Phase 13 / `7d96987` | |
| Strict opt-in client/QS/PM scoping (Dashboard, Analytics, Documents, BOQ, Price Intelligence) | live | `96714b8`, `2d0ba98`, `4915ed5`, `9a55c69` | |
| Invoice crash bug fix + client portal project scoping | live | `bff2643` | |
| `documentAggregator` hardened against unvalidated caller | live | `5bc2cad` | |
| Sentry error tracking, genuinely wired up | live (needs `SENTRY_DSN` set) | `feature/sentry-integration` | Was listed as an env var for a long time with zero `Sentry.*` calls anywhere in the code — a documented placeholder, not a working integration. Now reports 5xx responses (`errorHandler.js`) and unhandled process errors (`index.js`); deliberately does not report expected 4xx errors. No-ops safely with no DSN set. Caught a real pre-existing bug while being built: the original `errorHandler.js` computed `statusCode` before the Mongoose/JWT-specific branches remapped it, so a naive "report if >=500" check would have reported every CastError/ValidationError/JWT error as if it were a real server error — fixed by moving the check after those branches, covered by `errorHandler.test.js`. |
| **Critical fix:** `zodValidate.js` used zod v3's `result.error.errors` API, but the installed dependency is zod v4, which renamed it to `.issues`. Every failed validation on register, login, forgot-password, reset-password, estimate creation, invoice creation, and waitlist signup was crashing with an unhandled `TypeError` instead of returning a clean 400 with field messages — since presumably whenever this code was written/last touched. | fixed | found + fixed writing `zodValidate.test.js` | This means any user who ever mistyped an email or used a short password on register/login was hitting a raw 500, not a helpful validation message. Worth checking Sentry once it's live for how often this actually fired historically. |

## AI BOQ Drafter

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| Draft BOQ line items from a free-text project description | partial | `feature/ai-boq-drafter` | Needs `ANTHROPIC_API_KEY` — unlike the Site Report Summariser, there's no non-AI fallback here (generating line items from prose has no rule-based equivalent), so with no key set it returns a clear "not configured" message rather than a degraded result. Grounds rates against the company's own QS Pricing Library where an item matches (labeled "Your library" vs "AI estimate" in the UI); nothing is persisted until the user reviews the draft and clicks Create — that goes through the same `POST /boq` + `POST /boq/:id/items` endpoints the manual BOQ Builder uses. "AI Draft" button on the BOQ Builder page. Distinct from the existing rule-based "Smart Estimator" (Phase 5) — different feature, deliberately different name to avoid confusion. |

## Cash Flow Predictor

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| High-risk client flagging by payment history | live | `feature/cash-flow-predictor` | Rule-based (no external API), computed live from invoice payment history — same approach as BOQ Reviewer/Rate Alerter. Scores clients by max/avg days late and on-time rate, not just current balance. New "Cash Flow Risk" tab on Analytics. |

## Site Report Summariser

| Feature | Status | Introduced | Notes |
|---|---|---|---|
| One-paragraph client update generated from site reports | partial | `feature/site-report-summariser` | Needs `ANTHROPIC_API_KEY` configured to produce AI-generated prose — falls back to a plain-text extractive summary otherwise, never fails outright. "Client Update" button on Site Reports page. Only summarizes fields the SiteReport schema actually persists — see the schema gap noted below. |

## Programme of Works

| Feature | Status | Introduced |
|---|---|---|
| Gantt chart, weekly reports, duration reference | live | `2193328` |

## Layla chatbot

| Feature | Status | Introduced |
|---|---|---|
| Chatbot on landing page + all app pages | live | `a9449be`, `5817703` |
| Suggested-question chips | live | `a082ab8`, shrunk `a2b1195` |

## Growth / landing page

| Feature | Status | Introduced |
|---|---|---|
| Book-a-Call onboarding flow (replacing open self-registration) | live | `3187d84`, restored free sign-up `98b6664` |
| Launch waitlist form (Phase 12) | live | `b276685`, `6fcd9a7` |
| FAQ section, manual base rate override, Master Import entry point | live | `418d42e` |

## Rebrand

| Item | Status | Introduced |
|---|---|---|
| Pico Bello Projekte → SquareMetre rename (logo, favicon, manifest, hero copy) | live | `2500eac`, `6d63755`, `5edd352` |

## Known partial / unconfigured (not code gaps — see MASTER_DOCUMENT.md §15)

- AWS S3 image uploads — dependency present, not configured
- Browser push notifications — VAPID keys not generated
- Company logo on invoice PDF — pending asset
- Site Report Summariser's AI mode and the AI BOQ Drafter — both need `ANTHROPIC_API_KEY` set in production; the Summariser's extractive fallback works today with no configuration, the BOQ Drafter does not function at all without the key

## Known schema gap (found while building the Summariser, not fixed here)

`SiteReport`'s Mongoose schema only defines the "daily" report fields
(description, workCarriedOut, materialsUsed, problems, actionsRequired,
etc.). The frontend form's weekly/incident/snag/delivery/inspection
sections collect additional fields — `weeklyWorkPlanned`, `weeklyMilestones`,
`incidentDescription`, `snagItems`, `deliveryItems`, `inspectionChecklist`,
and others — that aren't in the schema. Mongoose's default strict mode
silently drops unknown fields on save, so none of that data ever reaches
MongoDB; it's not a crash, just quietly lost, which is exactly the class of
bug Phase 8's silent-failure audit was meant to catch. Worth a follow-up:
either add those fields to the schema (with a migration for anything only
recoverable from application logs) or, if some of those report types were
never really in use, drop the dead template options from the frontend.

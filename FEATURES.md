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
| Paystack payment links + team disbursements | partial | `a9a3a51` | Webhook needs live config — MASTER_DOCUMENT.md §15.2 |
| Stable public invoice payment links (`publicToken`) | live | `44d3c2a`, `871fa61` | |

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
- Paystack online payments — webhook not configured live
- Browser push notifications — VAPID keys not generated
- Company logo on invoice PDF — pending asset

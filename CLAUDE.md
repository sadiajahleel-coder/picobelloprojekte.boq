# SquareMetre BOQ System — orientation for Claude Code

Construction BOQ (Bill of Quantities), project management, and client-portal
system. Node/Express + MongoDB backend, React/Vite frontend, deployed on
Render. Formerly "Pico Bello Projekte" — some pre-rebrand naming still
lingers in a few filenames/URLs, noted where it matters.

**Read in this order before doing anything else:**

1. `MASTER_DOCUMENT.md` — the full technical handoff: stack, schema, every
   API route, every env var, known issues, how to run locally, how to
   deploy. If you have one question about how this system works, it's
   answered in here.
2. `FEATURES.md` — catalog of every feature that exists, which commit
   introduced it, and what's live vs. partial/unconfigured. Check this
   before assuming something isn't built yet.
3. `BRANCHING.md` — the git workflow. Read this before your first commit.

## Non-negotiables

- **Branch off `dev`, never off `main` or `staging`.** Both are
  branch-protected — a direct push will be rejected, not silently
  ignored. Everything goes through a PR: `feature/* → dev → staging → main`.
- **`dev` is fine for direct pushes** on small work; anything non-trivial
  still gets its own `feature/<name>` branch.
- Before merging anything up the chain, run `npm test` in `backend/`
  (Node's built-in test runner, `node --test`) and `npm run build` in
  `frontend/`. Neither is enforced by CI yet — there isn't any — so this
  is on you to run by hand.
- This repo has a documented history (`MASTER_DOCUMENT.md` §16, `FEATURES.md`)
  of silent-failure bugs — swallowed catch blocks, schema fields the
  frontend collects but the backend never persists, etc. When touching
  existing code, check whether the thing you're about to add already has
  a sibling pattern (rateAlerter.js, boqReviewer.js, cashFlowPredictor.js
  are good reference points for "computed live, nothing persisted, no
  external API" style features) before inventing a new one.

## Known gaps as of the last handoff (check FEATURES.md for current state)

- `ANTHROPIC_API_KEY` is not set in production — the AI BOQ Drafter
  doesn't function without it (no fallback), and the Site Report
  Summariser runs in plain-text fallback mode without it.
- No staging Render environment yet — `staging` is a real branch with
  no hosted deployment behind it.
- No CI pipeline — tests and builds are run manually.

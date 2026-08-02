# SquareMetre BOQ System — orientation for GitHub Copilot

Construction BOQ (Bill of Quantities), project management, and
client-portal system. Node/Express + MongoDB backend, React/Vite
frontend, deployed on Render. Formerly "Pico Bello Projekte" — some
pre-rebrand naming still lingers in a few filenames/URLs.

**Read before doing anything else:**

- `MASTER_DOCUMENT.md` — full technical handoff: stack, schema, every API
  route, every env var, known issues, local setup, deployment.
- `FEATURES.md` — every feature that exists, what commit introduced it,
  live vs. partial/unconfigured. Check before assuming something isn't
  built yet.
- `BRANCHING.md` — the git workflow, read before your first commit.

## Non-negotiables

- Branch off `dev`, never off `main` or `staging` — both are
  branch-protected on GitHub and a direct push will be rejected.
  `feature/* → dev → staging → main`, each promotion through a PR.
- Before merging anything up the chain: `npm test` in `backend/` and
  `npm run build` in `frontend/`. No CI exists yet, so this is manual.
- Check for a sibling pattern before inventing a new one — e.g.
  `backend/src/utils/rateAlerter.js`, `boqReviewer.js`,
  `cashFlowPredictor.js` are the established style for a "computed live,
  nothing persisted, no external API" feature.

## Known gaps (verify current state in FEATURES.md)

- `ANTHROPIC_API_KEY` not set in production — the AI BOQ Drafter doesn't
  function without it, the Site Report Summariser degrades to a
  plain-text fallback without it.
- No staging Render environment deployed yet.
- No CI pipeline.

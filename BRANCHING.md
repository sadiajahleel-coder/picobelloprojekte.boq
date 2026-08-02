# Branching Strategy

How work moves through this repo, from a new idea to production. Read this
before you push anything — it's the map for handing this project to another
engineer, or to another tool (Cursor, Claude Code, Copilot, whatever) picking
up where you left off.

## The hierarchy

```
feature/<name>  ─┐
fix/<name>       ├──►  dev  ──►  staging  ──►  main
chore/<name>    ─┘
```

| Branch | Purpose | Who deploys from it | Stability |
|---|---|---|---|
| `feature/*`, `fix/*`, `chore/*` | One unit of work each | Nobody (local/PR previews only) | Expect it to break |
| `dev` | Active development — where finished feature branches land first | Optional dev/preview environment | Should build, may have rough edges |
| `staging` | Dress rehearsal — a release candidate, frozen for QA | A staging Render environment (see below) | Should behave exactly like production |
| `main` | Production | Live Render services (auto-deploy on push) | Always deployable, always green |

Everything flows one direction: **feature → dev → staging → main**. Nothing
skips a stage, and nothing goes backward except a hotfix (see below).

## Branch naming

- `feature/<short-description>` — new functionality (e.g. `feature/smart-estimator`)
- `fix/<short-description>` — bug fixes (e.g. `fix/invoice-pdf-blank-items`)
- `chore/<short-description>` — tooling, docs, deps, refactors with no behavior change

Keep names short and kebab-case. No ticket-number-only names — a stranger
should be able to guess what the branch does from its name alone.

## Day-to-day workflow

1. Branch off `dev`: `git checkout dev && git pull && git checkout -b feature/my-thing`
2. Work, commit, push: `git push -u origin feature/my-thing`
3. Open a PR into `dev`. Merge once it builds and (if applicable) has been
   looked at.
4. Delete the feature branch after merge — `dev` is the durable record, not
   the feature branch.
5. When `dev` has a set of changes ready to be tried out end-to-end, open a
   PR from `dev` into `staging`. This is the "release candidate" — treat it
   as a freeze: only bug fixes found during staging testing get cherry-picked
   in, no new features.
6. Once staging checks out, open a PR from `staging` into `main`. Merging to
   `main` ships to production.

### Hotfixes

A production bug that can't wait for the normal flow: branch `fix/<name>`
off `main` directly, fix it, PR it into `main`, then immediately merge `main`
back into `staging` and `dev` so they don't drift.

## Branch protection

`main` and `staging` should both require:
- Pull request before merging (no direct pushes)
- At least 1 review (or self-review acknowledgment on a solo project)
- Status checks passing, once CI exists

`dev` can be looser (direct pushes for small fixes are fine), but PRs are
still the default for anything non-trivial.

> Setup note: this ruleset needs to be applied once from
> **GitHub → repo → Settings → Branches → Add branch protection rule**,
> for `main` and `staging`. Repository-admin permissions are required and
> this isn't something a `git push` can configure — see the bottom of this
> file for the exact rule to set on each.

## Deployment mapping (Render)

Render currently watches **`main` only** and auto-deploys both services
(`picobelloprojekte-boq-api`, `squaremetre-frontend`) on every push — see
`render.yaml` and `MASTER_DOCUMENT.md` §3/§13.

To make `staging` a real "dress rehearsal" and not just a git branch:
1. In the Render dashboard, duplicate both services (or create a new Blueprint
   from `render.yaml`) pointed at the `staging` branch instead of `main`.
2. Give them distinct names/URLs (e.g. `-staging` suffix) and their own env
   vars — **do not point a staging service at the production database.**
3. `dev` does not need its own hosted environment unless you want one; local
   `npm run dev` in `backend/` and `frontend/` is enough for day-to-day work.

This step has to be done by hand in Render's dashboard — it isn't something
this repo's files can configure on their own.

## Manual GitHub setup (do this once)

Repository admin access is required; the GitHub API token available to this
session did not have permission to set these automatically.

1. Go to **Settings → Branches** in the GitHub repo.
2. Add a rule for `main`:
   - Require a pull request before merging (1 approval)
   - Require status checks to pass before merging (once CI is added)
   - Do not allow bypassing the above settings
3. Add the same rule for `staging`.
4. Leave `dev` unprotected, or apply a lighter version (PR required, no
   review count) if the team prefers.

## New engineer / new tool checklist

1. Read `MASTER_DOCUMENT.md` for the full system handoff (stack, schema, API
   routes, env vars, known issues).
2. Read `FEATURES.md` for what's already built and where it came from.
3. Branch off `dev`, not `main`.
4. Follow the naming convention above so the branch list stays legible.

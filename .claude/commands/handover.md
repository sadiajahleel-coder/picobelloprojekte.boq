Set up complete handover documentation and a proper git branch hierarchy for this repo, so another engineer or AI tool (Cursor, Claude Code, Copilot, etc.) can pick it up cold.

## 1. Branch hierarchy
Check what branches exist. Set up (or document, if already present): feature/* → dev → staging → main.
- main = production (protected: require PR, no direct push)
- staging = pre-prod / dress rehearsal (protected same way)
- dev = active development (direct pushes OK for small work)
- feature/<name>, fix/<name>, chore/<name> branch off dev

Write this up in BRANCHING.md: naming conventions, promotion flow, branch protection steps (I'll do those manually in GitHub — just tell me exactly what to click), and how this maps to whatever's deployed (Render/Vercel/etc — note if staging has no hosted environment yet).

Don't retroactively split existing single-branch history into per-feature branches. Just document what's already built (see FEATURES.md below) and start the convention going forward.

## 2. FEATURES.md
Catalog every real feature currently in the codebase, pulled from git log and any existing docs — not just a file listing. For each: what it does, which commit(s) introduced it, current status (live / partial / unconfigured — cross-check against what env vars or external services it actually needs), and a pointer to more detail if it exists elsewhere.

## 3. Full technical handoff doc (MASTER_DOCUMENT.md, or update if one exists)
Stack and why, repo structure, every API route, every DB model/schema, every environment variable (see step 4 — get this from the code, not just .env.example), how to run locally, how to deploy, known issues, suggested next steps.

## 4. Env var audit — do this by reading the code, not trusting existing docs
Grep the actual codebase for every env var reference (process.env.*, import.meta.env.*, etc.) and diff that against .env.example and any deploy config (render.yaml, docker-compose.yml, vercel.json, whatever applies). Fill in what's missing in both. Flag anything that's declared but never read (dead config) and anything read but undocumented.

## 5. Dead code sweep
Look for orphaned code that doesn't belong to this project — leftover scaffolding from whatever template it was bootstrapped from, features never wired into any route, duplicate config files with conflicting settings. Verify thoroughly before deleting anything (check it's genuinely unreferenced, not just unfamiliar) and confirm with me before removing anything non-trivial.

## 6. Multi-tool AI onboarding files
Once the docs above exist, create short pointer files (not duplicated content) for every major AI-assisted editor, each in its own auto-read convention:
- CLAUDE.md (Claude Code)
- .cursor/rules/project-context.mdc (Cursor, with alwaysApply: true frontmatter)
- .github/copilot-instructions.md (GitHub Copilot)
- .windsurfrules (Windsurf)
- .clinerules (Cline)

Each should point at the docs above, plus inline only the handful of things dangerous not to know immediately (protected branches, no CI if that's true, any "looks broken but isn't" gotchas).

## 7. Verify before shipping
Run the actual test suite and build for every part of the stack before pushing anything. If no tests exist, say so rather than skipping verification silently — add minimal tests for anything genuinely risky you touch.

Push everything through the hierarchy you just set up: feature branch → dev → staging → main, real PRs, not just direct pushes to protected branches.

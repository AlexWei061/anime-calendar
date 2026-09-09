# Self-hosted Hong Kong Deployment Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement the bounded tasks below, with root integration and review. Preserve the user's uncommitted baseline. Do not commit, push, purchase or deploy.

**Goal:** Preserve every anime-calendar feature while making the application independently deployable on a Hong Kong server with its own domain.

**Architecture:** Standard Next.js Node standalone server, Drizzle with better-sqlite3, private filesystem avatars, persistent storage, and Caddy/Docker Compose. Split the client by feature and retain existing pure domain functions and stable anime IDs.

**Tech Stack:** Next.js 16, React 19, TypeScript, SQLite, Node.js 24 LTS, Docker, Caddy, Node test runner.

## Task 1: Backend and storage

Files: db/index.ts, db/sqlite.js, app/auth.ts, app/api/**, lib/server/**, scripts/migrate-db.mjs, tests/database.test.mjs.

- [x] Open a temporary database, apply all checked-in migrations twice, verify table columns and retained records; add a failed multi-write transaction check before implementing the new driver.
- [x] Implement a process-local SQLite connection with WAL, busy timeout and Drizzle. Preserve schema and existing password hashes. Replace D1 batches with synchronous SQLite transactions, with no async work inside a transaction.
- [x] Store private avatar files under DATA_DIR using the existing hashed object keys. Validate version URLs, enforce upload limits and retain old files until the database update succeeds.
- [x] Use APP_ORIGIN for HTTPS Cookie and same-origin write validation. Restrict JSON bodies and authentication attempt frequency; return no-store private API responses and sanitized error logs.
- [x] Add a health endpoint which actually reads the database. Run `node --test tests/database.test.mjs` and typecheck after integration.

## Task 2: Client decomposition

Files: app/page.tsx, app/components/**, app/hooks/**, app/types.ts, app/globals.css, app/styles/**, tests/auth-client-flow.test.mjs, tests/rendered-html.test.mjs.

- [x] Move shared types, cover rendering, date labels, clock and theme subscriptions into focused modules.
- [x] Extract account/requests, calendar views, search/statistics, selections and detail dialog without changing classes, markup semantics, URL page names or storage keys.
- [x] Preserve natural-day statistics versus broadcast-day pending episodes, batch watched toggles, optimistic rollback, logout failure behavior, and focus restoration.
- [x] Move expensive computations to their owners and memoize by actual inputs. Keep CSS import order and token values intact when splitting styles.
- [x] Replace assertions about old single-file placement with checks against the new module owners; root adds real production HTTP and browser checks.

## Task 3: Repeatable catalog maintenance

Files: scripts/generate-yuc-history-pilot.mjs, scripts/generate-cover-sprites.mjs, related lib helpers and tests.

- [x] Add a fixture where an existing fallback ID gains an AniList match and source rows reorder; assert the saved ID remains unchanged.
- [x] Match existing entries by explicit source identity and preserve IDs. Reject ambiguous identity reuse rather than silently moving account records.
- [x] Rebuild a fixture from existing sprites with no individual files; preserve thumbnail/detail output and use a staging directory before replacing production outputs.
- [x] Run focused tests. Do not refresh remote catalogs or rewrite the user's generated data merely to validate the generator.

## Task 4: Independent runtime and operations

Files: package.json, package-lock.json, next.config.ts, next-env.d.ts, tsconfig.json, Dockerfile, compose.yaml, Caddyfile, .dockerignore, .env.example, scripts/{backup,restore,import-d1,test}.mjs, README.md, AGENTS.md, docs/deployment.md.

- [x] Switch dev/build/start/test to standard Next.js and remove the unused Worker/Sites runtime files and dependencies after callers have migrated.
- [x] Build standalone output; include public files and .next/static in the runtime image, persist storage separately, and provide a health check. Bind only Caddy's HTTP/HTTPS ports.
- [x] Implement SQLite-consistent backups, restoration to a new directory, and import of user-supplied D1 SQL and R2 objects without overwriting existing storage or preserving old sessions.
- [x] Add a production test runner that starts Next on an ephemeral loopback port with temporary storage, runs all tests, and always shuts down its own process.
- [x] Document local development, first deployment, DNS/HTTPS, upgrades, off-server backups, restore and D1/R2 migration. State the teaching snapshot is historical after the refactor.

## Task 5: Integration and review

- [x] Run `npm run lint -- --ignore-pattern .worktrees` and `npm test`; correct failures rather than weakening behavioral assertions.
- [x] Test real HTTP registration/login/account isolation/selections/episodes/avatar/password-change and migration/backup rollback boundaries.
- [x] Run `docker compose config` and a Docker build if the local daemon permits it; report any unverified container/remote deployment boundary precisely.
- [x] Review diff against the saved uncommitted baseline, ensure no private data or credentials are tracked, and keep all 1514 anime IDs and cover mappings intact.
- [x] Obtain independent spec and code review; fix actionable findings and rerun affected checks. Return the implementation and verified local commands; no claim of live domain deployment.

Validation completed on 2026-09-08: 193/193 tests, clean lint and diff checks, real browser checks, final Linux/arm64 Docker startup/restart/backup/restore, Caddy validation, and independent review fixes. See `docs/self-hosted-verification.md`. No live domain deployment or real data migration was performed.

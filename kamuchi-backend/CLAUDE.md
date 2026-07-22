# Kamuchi Backend — Project Reference

## Status
Running **locally only**. Not on GitHub yet. Not hosted. This is the pre-launch hardening phase before it goes live and before employees/client start testing.

## Stack
- Node.js + Express 5
- Prisma ORM + SQLite (`prisma/dev.db`)
- Auth: JWT (`jsonwebtoken`) + `bcryptjs` for password hashing
- File uploads: `multer` (disk storage, local `/uploads`)
- Deployed via Docker (Dockerfile present)

## Project Structure
```
kamuchi-backend/
├── middleware/auth.js       # authMiddleware, adminMiddleware
├── prisma/schema.prisma
├── server.js                # all routes live here
├── uploads/
├── public/
└── root-level scratch scripts (see "Scripts to review" below)
```

## Schema (models)
`Client`, `ImportTracking`, `ChatMessage`, `LogisticsImport`, `LogisticsExport`,
`LogisticsDocument`, `User` (role: ADMIN | WORKER), `AuditLog`, `Notification`,
`Fournisseur`, `Supplier`, `Invoice`, `Tracteur`.

Full field-level schema is in `prisma/schema.prisma` — read it directly rather than assuming field names when writing whitelists or queries.

## Auth model
- Single-org app: all authenticated users are internal Kamuchi staff. No multi-tenant / per-user ownership separation needed.
- Roles: `ADMIN`, `WORKER`.
- `authMiddleware` = valid JWT required. `adminMiddleware` = must run after `authMiddleware`, requires `role === 'ADMIN'`.
- `JWT_SECRET` must come from `.env` only. **Never add a hardcoded fallback value** — the server should throw on startup if `JWT_SECRET` is unset.

## COMPLETED fixes (do not redo, but verify still in place)
- [x] Transactions wrapping multi-step writes on `link-export` / `link-import` routes
- [x] Global error handler (`server.js`, registered just before `app.listen`) — logs full error server-side via `console.error`, returns a generic `{ error: 'Internal server error' }` JSON body to clients when `NODE_ENV=production`, full `err.message` otherwise. Re-added 2026-07-16 after discovering it never actually existed in `server.js` despite being marked complete — no 4-arg error middleware was present anywhere in the file or git history, so all uncaught errors were previously falling through to Express's built-in HTML error page with zero server-side logging.
- [x] `Number(id)` params validated via a `parseIntParam` helper before querying, returns 400 on invalid input
- [x] `multer` upgraded to patch DoS vulnerability
- [x] Cascading deletes moved to schema level (`onDelete: Cascade`) where applicable
- [x] Hardcoded JWT fallback (`'kamuchi-super-secret-key-2024'`) removed — treat that string as burned, never reuse as a real secret

## OUTSTANDING — fix before this goes live, in priority order

### 1. CRITICAL: Most routes have NO auth middleware at all
Route inventory below reflects the last full read of `server.js`. **Re-verify against current code before changing anything** — don't trust this list blindly if the file has moved on.

Routes confirmed to have `authMiddleware` already: `imports` (POST/PUT), `logistics-imports` (POST/PUT/DELETE + link-export), `logistics-exports` (POST/PUT/DELETE + link-import), `logistics-documents` (POST/DELETE), `auth/me`, `users` (POST only).

Routes confirmed to have **no middleware at all** (fix these):
- `GET/POST/PUT /api/clients`
- `GET /api/imports`
- `GET /api/logistics-imports`, `GET /api/logistics-imports/:id`
- `GET /api/logistics-exports`, `GET /api/logistics-exports/:id`
- `GET /api/logistics-documents/:operationType/:operationId`
- `GET /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id`
- `POST /api/users/:id/generate-recovery`
- `GET /api/notifications`, `PUT /api/notifications/:id/read`, `DELETE /api/notifications/clear`
- `GET /api/audit-logs`
- `GET/POST/PUT/DELETE /api/fournisseurs`
- `GET/POST /api/suppliers`
- `GET /api/backup`
- `GET/POST/PUT/DELETE /api/invoices`
- `GET/POST/PUT/DELETE /api/tracteurs`
- `GET /api/analytics/financials`
- `GET /api/chat/:importId`

**Rule:** add `authMiddleware` to all of the above. `POST /api/auth/login` stays public by nature. `POST /api/setup` — see item 3 below, do not just slap auth on it blindly.

**Do not auto-decide which GET routes should be public vs staff-only.** Flag ambiguous ones (e.g. read-only logistics data) and ask before deciding — that's a product call, not a pure security fix.

### 2. CRITICAL: Admin-gate the especially sensitive routes
These need **both** `authMiddleware` AND `adminMiddleware`:
- `GET /api/backup` (downloads the entire SQLite DB — this is a full data export, admin only, no exceptions)
- `DELETE /api/users/:id`
- `PUT /api/users/:id` (role/permission changes should be admin-only — if there's a legitimate case for a worker editing their own profile, that needs a **separate**, narrower route, not this one opened up)
- `POST /api/users/:id/generate-recovery`
- All `DELETE` routes generally (logistics-imports, logistics-exports, fournisseurs, invoices, tracteurs)
- ~~`DELETE /api/notifications/clear`~~ — **reverted to `authMiddleware`-only on 2026-07-16.** Admin-gating it broke the live "clear notifications" button for workers/clients (`NotificationCenter.jsx`, mounted in all three dashboards) with no replacement in place. Do not re-add `adminMiddleware` here until item 9 is resolved.

### 3. CRITICAL: Secure `POST /api/setup`
Read the current implementation first. If it creates an admin account with zero protection, it's a rogue-admin-creation risk the moment this app is reachable on any network. Fix: only allow it to run if there are currently zero `User` rows in the DB (first-run only), reject otherwise. Don't just add `authMiddleware` — that defeats the point of an initial setup route.

### 4. ~~CRITICAL: Fix mass assignment on PUT routes using `data: req.body`~~ — DONE 2026-07-16
Re-verified every PUT route against current `server.js`. Already safe before this pass: `PUT /api/clients/:id` (explicit destructure), `PUT /api/logistics-imports/:id` / `PUT /api/logistics-exports/:id` (already used a `pickFields(req.body, ALLOWED_FIELDS)` whitelist), `PUT /api/invoices/:id` (explicit destructure), `PUT /api/users/:id` (already hardcoded to `{ role }` only, plus now admin-gated — see item 2).

Fixed via the same `pickFields` whitelist pattern:
- `PUT /api/imports/:id` (`ImportTracking`) — added `IMPORT_TRACKING_UPDATABLE_FIELDS`. `clientId` deliberately excluded (reassigning which `Client` owns a tracking record is a structural change, not a routine edit; no frontend caller sends it — this route has no frontend caller of any kind today, `ImportTracking` is the legacy model per `debug-db.js`'s own comment).
- `PUT /api/fournisseurs/:id` — added `FOURNISSEUR_UPDATABLE_FIELDS`.
- `PUT /api/tracteurs/:id` — added `TRACTEUR_UPDATABLE_FIELDS`; the existing float-parsing loop now runs on the whitelisted `data` object instead of raw `req.body`.

All three verified live: legitimate field updates persist, an injected `id`/`clientId` in the request body is silently dropped (record's real id/relation unchanged), and made-up field names never reach Prisma.

### 5. ~~Bulk-update guard~~ — narrow guard DONE 2026-07-16, identity fix still open
`DELETE /api/notifications/clear` now rejects with 400 if neither `role` nor `userId` is present (also correctly rejects the empty-string case, `?role=&userId=`, which is what `NotificationCenter.jsx` actually sends when a prop is missing — verified live). This guard is independent of item 9 and doesn't presuppose its outcome either way.

Still open, blocked on item 9: the route still trusts `role`/`userId` from the query string rather than deriving identity from `req.user`. Don't close this item fully until item 9's identity-derivation fix lands.

### 6. ~~Review and clean up root-level scratch scripts~~ — DONE 2026-07-16
Deleted (all checked clean of anything beyond bcrypt hashes / hardcoded default passwords, none leaked live secrets): `get_passwords.js`, `get_users.js`, `reset-admin.js`, `reset_passwords.js` (both reset scripts hardcoded known default passwords — `admin123` / `password123` — real risk if run against the wrong DB), `inspect-19.js` (one-off debug tied to a since-resolved issue), `err.log`/`error.log`/`prisma_error.txt` (stale pre-error-handler crash logs from the original Windows dev machine, checked for secrets — clean, just local file paths).

Kept `debug-db.js` (genuinely useful read-only diagnostic) and moved it, along with `seed-demo.js` (see item 3), into `kamuchi-backend/scripts/` — gitignored, never committed. `package.json`'s `seed-demo` script updated to `node scripts/seed-demo.js`. Root `.gitignore` now also has `*.log`.

Note: all 9 files were already committed in the initial commit before this cleanup (repo isn't on GitHub yet) — purging them from git *history* (not just the working tree) is still open, folded into item 8.

### 7. ~~Pagination~~ — DONE 2026-07-16
Added `take: 500` to every unbounded global list `findMany()`: the 3 originally named (`GET /api/logistics-imports`, `GET /api/logistics-exports`, `GET /api/users`) plus `GET /api/clients`, `GET /api/imports`, `GET /api/suppliers`, `GET /api/invoices`, `GET /api/tracteurs`, `GET /api/fournisseurs` (same unbounded pattern, found during re-verification). Deliberately left uncapped: the `findMany()` calls inside `GET /api/analytics/financials` that sum *all* tracteur/fournisseur/invoice rows for revenue/expense totals — capping those would silently produce wrong financial numbers past 500 rows, a correctness bug, not a fix. Also left uncapped: `logisticsDocument`/`chatMessage` queries scoped to a single operation/import id — naturally bounded by that filter, not a global list. Proper offset/cursor pagination still not implemented — this is only the hard-cap stopgap the item asked for.

### 8. Before first GitHub push
Once this repo is ready to go to GitHub (even private):
- Confirm `.env` is gitignored (already confirmed as of last check — re-verify)
- Confirm none of the root-level scratch scripts or log files are staged
- Do a final `git log` / `git diff` check for anything resembling a secret before the first push, since this has never been through version control

### 9. IDOR-shaped gap: `notifications` routes trust query params for identity
Found 2026-07-16 while deciding how to gate `DELETE /api/notifications/clear`. `GET /api/notifications` and `DELETE /api/notifications/clear` both take `role`/`userId` straight from the query string and use them directly in the Prisma `where` clause — they never check these against the authenticated identity in `req.user` (the JWT payload). Any authenticated user can currently pass an arbitrary `role` or `userId` and read or bulk-mark-as-read notifications outside their own scope.

Confirmed real-world call pattern (`NotificationCenter.jsx`, mounted in Worker/Client/Admin dashboards): callers always pass `role` (e.g. `role="CLIENT"`, `role="ADMIN"`, or the logged-in worker's own role), never `userId`. So today "clear" already marks *every* notification for that whole role bucket as read, not just the caller's own — this is a shared/bulk action by current design, not a mislabeled personal one.

Two dependencies before this can be properly fixed:
1. **Product decision**: should notifications be per-user (each user only sees/clears their own) or per-role-shared (current behavior, one shared feed per role)? This determines the target data model / query shape, not just the auth check.
2. **Auth fix**: once (1) is decided, switch the route(s) to derive identity from `req.user` (set by `authMiddleware` from the verified JWT) instead of trusting client-supplied `role`/`userId` query params.

Don't fix the auth side in isolation without (1) — deriving `req.user.role` server-side while the underlying model is still role-shared just locks in the current shared-feed behavior as if it were intentional, when it hasn't actually been decided yet.

## Working style for this project
- Don't silently batch large changes — show diffs per fix, not one giant commit.
- Don't auto-decide ambiguous access-control questions (which routes are public, which fields are editable, which scripts to delete) — flag and ask.
- This is a single-org app — fixes should be about role-gating (ADMIN vs WORKER) and closing open routes, not building multi-tenant ownership logic.

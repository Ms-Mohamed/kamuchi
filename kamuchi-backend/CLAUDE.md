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
- [x] Global error handler — no longer leaks `error.message` to clients in production
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
- `DELETE /api/notifications/clear` (bulk operation — also still needs the empty-filter guard, see item 5)

### 3. CRITICAL: Secure `POST /api/setup`
Read the current implementation first. If it creates an admin account with zero protection, it's a rogue-admin-creation risk the moment this app is reachable on any network. Fix: only allow it to run if there are currently zero `User` rows in the DB (first-run only), reject otherwise. Don't just add `authMiddleware` — that defeats the point of an initial setup route.

### 4. CRITICAL: Fix mass assignment on PUT routes using `data: req.body`
Any route doing `data: req.body` directly into a Prisma `update()` call lets a client overwrite any field, including ones that should never be client-writable (`id`, `createdAt`, etc). Read the actual Prisma model for each affected resource and replace with an explicit field whitelist. Ask before finalizing which fields are legitimately client-editable per model — don't guess, especially for `User` (never let `role` be settable through a generic profile-update path).

### 5. Bulk-update guard
`DELETE /api/notifications/clear` — currently can execute with an empty `where: {}` if no filter is passed, marking every notification system-wide as read. Add a guard: reject with 400 if neither `role` nor `userId` is present in the query.

### 6. Review and clean up root-level scratch scripts
These sit in the repo root and haven't been assessed:
```
get_passwords.js
get_users.js
reset-admin.js
reset_passwords.js
debug-db.js
inspect-19.js
prisma_error.txt
err.log
error.log
```
For each `.js` file: report what it does and whether it touches plaintext passwords or bypasses auth, **before deleting anything**. Filenames suggest direct credential access — these should not end up in git history when this repo is eventually pushed to GitHub. Decide per-file: delete, or move to a local `.gitignore`'d `/scripts` or `/tools` folder that never gets committed. Log files (`err.log`, `error.log`) should also be checked for sensitive data before being gitignored/cleared, since they were capturing errors before the global error handler fix — retire and clear them.

### 7. Pagination (HIGH, not launch-blocking but do soon)
`GET /api/logistics-imports`, `GET /api/logistics-exports`, `GET /api/users` use unbounded `findMany()`. Add at minimum a hard `take: 500` limit; proper offset/cursor pagination can come later.

### 8. Before first GitHub push
Once this repo is ready to go to GitHub (even private):
- Confirm `.env` is gitignored (already confirmed as of last check — re-verify)
- Confirm none of the root-level scratch scripts or log files are staged
- Do a final `git log` / `git diff` check for anything resembling a secret before the first push, since this has never been through version control

## Working style for this project
- Don't silently batch large changes — show diffs per fix, not one giant commit.
- Don't auto-decide ambiguous access-control questions (which routes are public, which fields are editable, which scripts to delete) — flag and ask.
- This is a single-org app — fixes should be about role-gating (ADMIN vs WORKER) and closing open routes, not building multi-tenant ownership logic.

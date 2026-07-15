# Kamuchi Trans
Import tracking and communication platform — workers manage shipments, clients track them.

## Stack
- Frontend: React + Vite (port 5173)
- Backend: Node.js + Express (port 5000)
- DB: SQLite + Prisma ORM
- File uploads: Multer

## Structure
- kamuchi-frontend/src/components: auth, chat, client, worker
- kamuchi-backend: server.js (entry), prisma/schema.prisma, uploads/

## Rules
- After any schema.prisma change: run `npx prisma generate` then `npx prisma db push`
- Frontend env vars must use VITE_ prefix
- Check index.css for existing classes before writing new styles
- All new backend routes need CORS configured in server.js
- Prefer functional components + hooks, no class components

## Dev Commands
- Backend: `cd kamuchi-backend && npm run dev`
- Frontend: `cd kamuchi-frontend && npm run dev`
- DB sync: `npx prisma db push`

## Current State
- [x] Full-stack authentication flow for Admins, Workers, and Clients with JWT token storage & session persistence.
- [x] Complete SQLite database schema setup (via Prisma ORM) with models for Clients, Imports/Exports, AuditLogs, Notifications, and ChatMessages.
- [x] REST API endpoints in `server.js` for CRUD operations, document management, and notifications.
- [x] Base frontend components for Login, Workers Dashboard, Client Dashboard, and Group Chats.
- [x] Document and file association via Multer.
- [ ] Connect and verify backend-frontend communication in the new workspace path.
- [ ] Implement automated testing/verification suite if needed.

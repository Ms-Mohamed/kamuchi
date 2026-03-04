# Kamuchi Trans

A full-stack import tracking and communication platform for managing shipment logistics between workers and clients.

## Features

- **Worker Dashboard** — Track active imports, manage clients, and communicate via per-import group chat
- **Client Dashboard** — View shipment status and chat with the worker
- **Guest Chat Access** — Join a specific chat using a secret code
- **Smart Detection** — Automatically detects matricule, port, and location from chat messages
- **File Uploads** — Upload and download real documents (Avis, Facture, BL, Bon) directly in the chat
- **Session Persistence** — Stay logged in across page refreshes

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | React + Vite                |
| Backend   | Node.js + Express           |
| Database  | SQLite via Prisma ORM       |
| File Upload | Multer                    |

## Project Structure

```
kamuchi trans/
├── kamuchi-frontend/    # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── auth/          # Login screen
│       │   ├── chat/          # GroupChatHub, GuestChatView
│       │   ├── client/        # Client dashboard
│       │   └── worker/        # Worker dashboard, TrackingTable, ClientManager
│       ├── App.jsx
│       └── index.css
├── kamuchi-backend/     # Express API server
│   ├── prisma/
│   │   └── schema.prisma
│   ├── server.js
│   └── uploads/         # Uploaded files stored here
└── .gitignore
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Backend Setup
```bash
cd kamuchi-backend
npm install
npx prisma db push
npm run dev
```
The backend runs on `http://localhost:5000`.

### Frontend Setup
```bash
cd kamuchi-frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:5173`.

### Seed the Database (optional)
After starting the backend, seed sample data:
```bash
node setup-seed.js
```

## Login Options

| Role        | Input                        | View                          |
|-------------|------------------------------|-------------------------------|
| **Worker**  | No input needed              | Full dashboard with tracking  |
| **Client**  | Client reference or access code | Shipment status + chat     |
| **💬 Chat** | Secret access code           | Shipment info + group chat    |

## License

Private — All rights reserved.

# Arithmetic Mastery — MERN Stack

A full-stack checklist app for mastering arithmetic. Built with React + Vite, Node.js + Express, MongoDB + Mongoose.

## Features
- Expand/collapse curriculum sections
- Interactive topic checkboxes
- Progress dashboard with completion counts and progress bars
- Search topics and filter all / incomplete / completed
- Add custom sections and topics
- Delete custom topics and sections
- Persistent data in MongoDB
- Responsive dark UI inspired by minimal productivity apps

## Requirements
- Node.js 20+
- MongoDB running locally or a MongoDB Atlas connection string

## 1. Install dependencies

Open a terminal in the project root:

```bash
npm install
npm run install:all
```

## 2. Configure the backend

Copy `server/.env.example` to `server/.env` and update `MONGODB_URI` if needed.

Default local URI:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/arithmetic_mastery
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

## 3. Run the app

From the root:

```bash
npm run dev
```

This starts:
- React frontend: http://localhost:5173
- Express API: http://localhost:5000/api/health

On first start, the server seeds the full arithmetic curriculum if the database has no sections.

## Useful scripts
- `npm run dev` — run frontend and backend together
- `npm run dev:client` — frontend only
- `npm run dev:server` — backend only
- `npm run build` — production frontend build

## API overview
- `GET /api/sections` — list curriculum sections and topics
- `POST /api/sections` — create a custom section
- `PATCH /api/sections/:sectionId` — rename a section
- `DELETE /api/sections/:sectionId` — delete a section
- `POST /api/sections/:sectionId/topics` — add a topic
- `PATCH /api/topics/:topicId` — update topic title/completion
- `DELETE /api/topics/:topicId` — delete a topic
- `GET /api/health` — API health check

## Notes
The frontend includes a local fallback mode if the API is unavailable, but permanent cross-device persistence requires the backend and MongoDB to be running.

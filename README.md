# ContextGraph Frontend (`frontend_garph`)

React + Vite frontend for ContextGraph, the Digital Memory & Context Recovery System.

## Features included
- Registration and login UI with JWT token storage and logout
- Responsive workspace with dashboard, document library, upload, search, graph, timeline, collections, search history, and settings views
- Centralized API client that attaches the JWT token, handles JSON and multipart requests, and shows meaningful errors
- PDF upload, document list/detail/delete, and search integration
- API-backed views do not silently substitute fake records when the backend is unavailable
- Loading, empty, and error states
- Vercel SPA rewrite configuration

## Requirements
- Node.js 18+ (Node.js 20+ recommended)
- ContextGraph Spring Boot backend running and reachable
- Backend must expose the endpoints used by `src/api.js`

## Run locally
1. Extract this folder.
2. Open a terminal in `frontend_garph`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create `.env` from `.env.example` and set `VITE_API_BASE_URL`.
5. Start the frontend:
   ```bash
   npm run dev
   ```
6. Open the URL printed by Vite (normally `http://localhost:5173`).

## Build check
```bash
npm run build
```

## API base URL
`VITE_API_BASE_URL` is the backend API root and should include `/api`, for example:
`https://contextgraph-7k4e.onrender.com/api`

If running the backend locally, set it to `http://localhost:8080/api`.

## Expected API endpoints
- `POST /auth/register` — `{ name, email, password }`
- `POST /auth/login` — `{ email, password }`
- `GET /auth/me`
- `GET /documents`
- `POST /documents/upload` — multipart form field `file`
- `GET /documents/{id}`
- `DELETE /documents/{id}`
- `GET /search?q={query}`
- `GET /search/history`
- `GET /dashboard/stats`
- `GET /graph`
- `GET /timeline`
- `GET /collections`
- `POST /collections` — `{ name, description }`
- `PATCH /collections/{id}` — `{ name, description }`
- `DELETE /collections/{id}`
- `GET /profile`
- `PATCH /profile` — profile fields supported by backend

Some optional endpoints may not yet exist in your current backend. The UI reports API errors rather than pretending an operation succeeded. Align route names and response fields with the backend implementation if they differ.

## Deployment to Vercel
1. Push this folder to GitHub.
2. Import the repository/project into Vercel.
3. Set **Root Directory** to `frontend_garph` if it is inside a parent repository.
4. Set environment variable `VITE_API_BASE_URL` to `https://contextgraph-7k4e.onrender.com/api`.
5. Deploy.

`vercel.json` rewrites client-side routes to `index.html`.

## Important
The frontend build can be verified independently, but complete end-to-end correctness depends on the backend's actual endpoint paths, CORS configuration, JWT response shape, and deployed database. Verify those with the backend logs and API responses before claiming the whole full-stack system is error-free.

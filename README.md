# 🌿 PlantGuard Frontend

PlantGuard is an AI-powered plant disease detection system, built as a graduation project. This repository contains the **web frontend**. It talks to the PlantGuard backend through a REST API.

- **Live app:** https://plantguard-frontend-1eeae.containers.snapdeploy.app
- **Backend repository:** https://github.com/shahdnower-iu/plantguard-backend

---

## Features

- **Authentication:** email sign up with OTP verification, login, and Google sign-in
- **My Plants:** add plants with photos, view plant details, and manage care schedules
- **Disease detection:** upload a plant photo and get an AI diagnosis with treatment advice
- **Spread analysis:** upload 1 to 4 photos to analyze how a disease is spreading
- **Plant assistant chat:** ask questions about your plants, optionally with a scan as context
- **Analytics:** overview, plant timelines, and monthly reports
- **Notifications:** care reminders and alerts
- **Subscription:** free tier with weekly scan limits, plus a PRO plan

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) with TypeScript
- React
- Tailwind CSS
- Docker (multi-stage build, Next.js standalone output)

## Project Structure

```
plantguard-frontend/
├── app/          # Pages and routes (Next.js App Router)
├── components/   # Reusable UI components
├── context/      # React context providers (e.g. auth)
├── hooks/        # Custom React hooks
├── lib/          # API client and helpers
├── public/       # Static assets
├── Dockerfile
└── next.config.mjs
```

## Getting Started (Local Development)

### Prerequisites

- Node.js 20 or newer
- npm
- The PlantGuard backend running locally (default: `http://localhost:3001`)

### 1. Clone and install

```bash
git clone https://github.com/shahdnower-iu/plantguard-frontend.git
cd plantguard-frontend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the PlantGuard backend, with no trailing slash |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID for "Sign in with Google" |

> **Note:** `NEXT_PUBLIC_*` variables are embedded into the app at **build time**. If you change them, rebuild the app.
>
> Never commit your `.env` file. Only the public client ID belongs in the frontend; the Google client secret belongs on the backend only.

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |

## Docker

The project uses a multi-stage Dockerfile and Next.js `output: 'standalone'` for a small production image.

### Build

Pass the public variables as build arguments:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://your-backend-url \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id \
  -t plantguard-frontend .
```

### Run

```bash
docker run -p 3000:3000 plantguard-frontend
```

The app is then available at http://localhost:3000.

## Deployment (SnapDeploy)

1. Push the repository to GitHub.
2. Create a new app on SnapDeploy from this repo and choose **Docker**.
3. Set the port to `3000`.
4. Set these **build arguments**:
   - `NEXT_PUBLIC_API_URL` = your deployed backend URL
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your Google client ID
5. Deploy and copy the frontend URL.
6. On the **backend**, set `CORS_ORIGIN` to the frontend URL (no trailing slash) and restart it.
7. In Google Cloud Console, add the frontend URL to the OAuth client's **Authorized JavaScript origins**.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| "Failed to fetch" on login | The backend's `CORS_ORIGIN` doesn't exactly match the frontend URL, or the backend wasn't restarted |
| Requests go to `localhost:3001` in production | `NEXT_PUBLIC_API_URL` wasn't passed as a build argument; rebuild the image |
| Google login fails with `origin_mismatch` | The frontend URL isn't added to the OAuth client's authorized origins |
| Container stops right after starting | The app isn't listening on `0.0.0.0`; keep `HOSTNAME=0.0.0.0` in the start command |

## Author

**Shahd Nower**, Big Data Analytics, graduation project.

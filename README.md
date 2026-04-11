# IoT Test Rig Dashboard

A React dashboard with an Express + Prisma backend for monitoring an IoT test rig and serving live telemetry from Azure SQL / SQL Server.

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS 3
- Recharts
- Express
- Prisma
- Microsoft SQL Server

## Features

- Login page with remember-me email support
- Responsive dashboard layout with profile area, logout button, alerts, charts, and CSV export
- Live telemetry for switch, ToF, temperature, and accelerometer sensors
- Threshold-based alerts and operational insights
- Sensor filtering and CSV export
- Connected/disconnected status indicator
- SQL Server-backed API endpoint for dashboard data
- PLC-ready ingest endpoint for HTTP / Modbus-TCP middleware
- Security middleware with Helmet, CORS restriction, and rate limiting

## Folder Structure

```text
D:\Demo Dash
|-- prisma
|   |-- migrations
|   |-- schema.prisma
|   `-- seed.mjs
|-- public
|-- server
|   |-- dashboardService.js
|   |-- db.js
|   |-- env.js
|   `-- index.js
|-- src
|   |-- App.jsx
|   |-- index.css
|   |-- main.jsx
|   |-- styles.generated.css
|   |-- components
|   |   |-- DashboardLayout.jsx
|   |   `-- LoginPage.jsx
|   |-- hooks
|   |   `-- useSensorSimulation.js
|   `-- lib
|       `-- api.js
|-- .env.example
|-- package.json
|-- render.yaml
`-- README.md
```

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill in your Azure SQL / SQL Server credentials.
3. Generate Prisma:
   ```bash
   npm run prisma:generate
   ```
4. Start the dashboard and API together:
   ```bash
   npm run dev
   ```
5. Open `http://127.0.0.1:5173`.

## Production Hosting

This project is now set up so one Node service can host both:
- the built React dashboard
- the live `/api/*` backend

That is the best option for continuously fetching live Azure SQL data.

### Render deployment

1. Push this project to GitHub.
2. Create a new Render Web Service from the repo.
3. Render can use [render.yaml](D:\Demo Dash\render.yaml), or set these manually:
   - Build command: `npm install && npm run prisma:generate && npm run build`
   - Start command: `npm start`
4. Set environment variables in Render:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `DB_SERVER`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_PORT=1433`
   - `APP_SECRET`
   - `INGEST_API_KEY`
   - `CLIENT_ORIGIN=https://your-render-url.onrender.com`
5. In Azure SQL firewall, allow Render's outbound IP or allow Azure services if appropriate.
6. Deploy.

After deploy, the dashboard frontend and backend will run on the same host, and the browser will fetch live data from `/api/dashboard` on that hosted service.

## PLC / Live Ingest

Send PLC middleware data to:

```http
POST /api/ingest
x-api-key: <INGEST_API_KEY>
Content-Type: application/json
```

Example payload:

```json
{
  "device_id": "RIG-001",
  "timestamp": "2026-04-06T12:00:00Z",
  "switch_value": true,
  "distance_mm": 312.5,
  "part_count": 145,
  "temperature": 36.2,
  "accel_x": 0.44,
  "accel_y": 0.31,
  "accel_z": 0.92
}
```

## Security Notes

- Keep DB credentials server-side only.
- Keep `.env` out of version control.
- Rotate any password that was shared in screenshots or chat.
- Replace `APP_SECRET` with a long random secret before production.
- Set `CLIENT_ORIGIN` to the exact deployed frontend URL.
- Keep the Azure SQL firewall restricted to your hosting provider or known IPs.

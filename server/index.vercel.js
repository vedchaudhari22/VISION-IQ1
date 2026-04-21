import { createServer } from '@vercel/node';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'node:url';
import env from './env.js';
import { getDashboardSnapshot, getPublicConfig, ingestSensorReading } from './server/dashboardService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(require('helmet')({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const clientOrigin = env.CLIENT_ORIGIN;
app.use(require('cors')({
  origin(origin, callback) {
    if (!origin || !clientOrigin || origin === clientOrigin) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS."));
  },
  methods: ["GET", "POST"]
}));

app.use(require('express-rate-limit')({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false
}));

// Public config endpoint
app.get('/api/public/config', async (_req, res) => {
  try {
    const config = await getPublicConfig();
    return res.json(config);
  } catch (error) {
    console.error("Public config API error:", error);
    return res.status(500).json({ message: "Unable to load dashboard configuration." });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Dashboard snapshot endpoint
app.get('/api/dashboard', async (_req, res) => {
  try {
    const dashboard = await getDashboardSnapshot();
    if (!dashboard) {
      return res.status(404).json({
        message: "No device data found. Insert data into Devices, Sensor_Data, and Sensor_Thresholds first."
      });
    }
    return res.json(dashboard);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return res.status(500).json({
      message: "Unable to load dashboard data.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ingest endpoint for PLC/sensor data
app.post('/api/ingest', async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!env.INGEST_API_KEY || apiKey !== env.INGEST_API_KEY) {
      return res.status(401).json({ message: "Invalid ingest API key." });
    }

    const result = await ingestSensorReading(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    console.error("Ingest API error:", error);
    return res.status(400).json({ message: error.message || "Unable to store sensor reading." });
  }
});

// Serve static files in production
if (env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Export for Vercel
export default createServer(app);

// Local testing
if (import.meta.url === `file://${__filename}`) {
  const PORT = env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

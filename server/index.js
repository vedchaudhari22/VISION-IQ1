import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDashboardSnapshot, getPublicConfig, ingestSensorReading } from "./dashboardService.js";
import { loadEnv } from "./env.js";

const { port, clientOrigin, ingestApiKey } = loadEnv();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const indexHtmlPath = path.join(distDir, "index.html");
const isProduction = process.env.NODE_ENV === "production";
let lastKnownConfig = null;
let lastKnownDashboard = null;

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !clientOrigin || origin === clientOrigin) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST"]
  })
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/public/config", async (_req, res) => {
  try {
    const config = await getPublicConfig();
    lastKnownConfig = config;
    return res.json(config);
  } catch (error) {
    console.error("Public config API error:", error);
    if (lastKnownConfig) {
      return res.json(lastKnownConfig);
    }
    return res.status(500).json({ message: "Unable to load dashboard configuration." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    const dashboard = await getDashboardSnapshot();
    if (!dashboard) {
      return res.status(404).json({
        message: "No device data found. Insert data into Devices, Sensor_Data, and Sensor_Thresholds first."
      });
    }

    lastKnownDashboard = dashboard;
    return res.json(dashboard);
  } catch (error) {
    console.error("Dashboard API error:", error);

    if (lastKnownDashboard) {
      return res.json({
        ...lastKnownDashboard,
        isConnected: false,
        stale: true,
        staleReason: "Azure SQL is temporarily unreachable. Showing the last successful snapshot."
      });
    }

    return res.status(500).json({
      message: "Unable to load dashboard data."
    });
  }
});

app.post("/api/ingest", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!ingestApiKey || apiKey !== ingestApiKey) {
      return res.status(401).json({ message: "Invalid ingest API key." });
    }

    const result = await ingestSensorReading(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    console.error("Ingest API error:", error);
    return res.status(400).json({ message: error.message || "Unable to store sensor reading." });
  }
});

app.use(express.static(distDir, { index: false }));

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(indexHtmlPath);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

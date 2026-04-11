import dotenv from "dotenv";

dotenv.config();

export function loadEnv() {
  const influxUrl = process.env.INFLUX_URL;
  const influxToken = process.env.INFLUX_TOKEN;
  const influxOrg = process.env.INFLUX_ORG || "my-org";
  const influxBucket = process.env.INFLUX_BUCKET || "iot-data";

  if (!influxUrl || !influxToken) {
    throw new Error("Missing INFLUX_URL or INFLUX_TOKEN in environment.");
  }

  return {
    appSecret: process.env.APP_SECRET || "change-this-dev-secret-before-production",
    ingestApiKey: process.env.INGEST_API_KEY || "",
    port: Number(process.env.PORT || 4000),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    influxUrl,
    influxToken,
    influxOrg,
    influxBucket
  };
}
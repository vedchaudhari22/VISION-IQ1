import dotenv from "dotenv";

dotenv.config();

export function loadEnv() {
  const influxUrl = process.env.INFLUX_URL || process.env.INFLUXDB_URL;
  const influxToken = process.env.INFLUX_TOKEN || process.env.INFLUXDB_TOKEN;
  const influxOrg = process.env.INFLUXDB_ORG || "my-org";
  const influxBucket = process.env.INFLUXDB_BUCKET || "iot-data";

  return {
    appSecret: process.env.APP_SECRET || "change-this-dev-secret-before-production",
    ingestApiKey: process.env.INGEST_API_KEY || "",
    port: Number(process.env.PORT || 4000),
    clientOrigin: process.env.CLIENT_ORIGIN || "*",
    influxUrl: influxUrl || "",
    influxToken: influxToken || "",
    influxOrg,
    influxBucket
  };
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
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { loadEnv } from "./env.js";

const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

// Create a shared client (reused across serverless invocations)
const influxDB = new InfluxDB({ url, token });

// Shared write API instance
let writeApi = null;

export function getWriteApi() {
  if (!writeApi) {
    writeApi = influxDB.getWriteApi(org, bucket);
  }
  return writeApi;
}

// Shared query API instance
let queryApi = null;

export function getQueryApi() {
  if (!queryApi) {
    queryApi = influxDB.getQueryApi(org);
  }
  return queryApi;
}

export { influxDB, Point };

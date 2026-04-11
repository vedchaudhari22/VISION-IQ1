import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { loadEnv } from "./env.js";

const globalForInflux = globalThis;
const { influxUrl, influxToken, influxOrg, influxBucket } = loadEnv();

export const influxDb = globalForInflux.influxDb || new InfluxDB({
  url: influxUrl,
  token: influxToken,
  org: influxOrg,
  bucket: influxBucket
});

export const writeApi = globalForInflux.writeApi || influxDb.getWriteApi(influxOrg, influxBucket);
export const queryApi = influxDb.getQueryApi(influxOrg);

export function getWriteApi() {
  return influxDb.getWriteApi(influxOrg, influxBucket);
}

export { Point };

if (process.env.NODE_ENV !== "production") {
  globalForInflux.influxDb = influxDb;
}
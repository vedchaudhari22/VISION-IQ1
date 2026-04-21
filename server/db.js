import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { loadEnv } from "./env.js";

const { influxUrl, influxToken, influxOrg, influxBucket } = loadEnv();

export const influxDb = new InfluxDB({
  url: influxUrl,
  token: influxToken,
  org: influxOrg,
  bucket: influxBucket
});

export function getQueryApi() {
  return influxDb.getQueryApi(influxOrg);
}

export function getWriteApi() {
  return influxDb.getWriteApi(influxOrg, influxBucket);
}

export { Point };

const DEMO_USERS = [
  { id: "demo-1", email: "demo@example.com", passwordHash: "demo123:bd0eb9a8f3e0c4e8b1a2d3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b", role: "admin", isActive: true, fullName: "Demo User" },
  { id: "admin-1", email: "admin@iot.com", passwordHash: "admin:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", role: "admin", isActive: true, fullName: "Admin" }
];

const DEMO_PASSWORD = "demo123";

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return DEMO_USERS.find(u => u.email === normalizedEmail) || null;
}

export function createUser(email, password, fullName, role = "user") {
  const passwordHash = createPasswordHash(password);
  const newUser = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase().trim(),
    passwordHash,
    fullName,
    role,
    isActive: true
  };
  DEMO_USERS.push(newUser);
  return newUser;
}
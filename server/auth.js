import crypto from "crypto";
import { findUserByEmail } from "./db.js";
import { loadEnv } from "./env.js";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const SCRYPT_KEY_LENGTH = 64;

function getAppSecret() {
  const { appSecret } = loadEnv();
  return appSecret;
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function hashPassword(password) {
  return createPasswordHash(password);
}

export function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = String(storedHash || "").split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = createPasswordHash(password, salt).split(":")[1];
  return timingSafeEqual(actualHash, expectedHash);
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signAuthToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getAppSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", getAppSecret()).update(encodedPayload).digest("base64url");
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload));
  if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

export async function authenticateUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  };
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Authentication required." });
  }

  req.auth = payload;
  return next();
}

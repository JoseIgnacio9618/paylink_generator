import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const computed = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const original = Buffer.from(hash, "hex");

  if (computed.length !== original.length) {
    return false;
  }

  return timingSafeEqual(computed, original);
}

export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

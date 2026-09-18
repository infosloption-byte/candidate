import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const createOpaqueToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

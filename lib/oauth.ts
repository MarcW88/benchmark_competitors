import { createHmac, createHash } from "crypto";

function secret() {
  return process.env.DATAFORSEO_PASSWORD ?? "dev-secret";
}

export function baseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function signPayload(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyPayload(token: string): object | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

export function sha256Base64url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

export function isValidAccessToken(token: string): boolean {
  return verifyPayload(token) !== null;
}

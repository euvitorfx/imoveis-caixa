import { createHmac, timingSafeEqual } from "crypto";

const secret = () => process.env.UNSUBSCRIBE_SECRET ?? "blc-unsub-fallback";

export function generateUnsubToken(userId: string): string {
  const mac = createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${Buffer.from(userId).toString("base64url")}.${mac}`;
}

export function validateUnsubToken(token: string): string | null {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return null;
    const encodedId = token.slice(0, dot);
    const mac = token.slice(dot + 1);
    const userId = Buffer.from(encodedId, "base64url").toString("utf8");
    const expected = createHmac("sha256", secret()).update(userId).digest("base64url");
    const macBuf = Buffer.from(mac);
    const expectedBuf = Buffer.from(expected);
    if (macBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(macBuf, expectedBuf)) return null;
    return userId;
  } catch {
    return null;
  }
}

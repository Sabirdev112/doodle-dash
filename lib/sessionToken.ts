import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface SessionClaims {
  roomId: string;
  playerId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.PUSHER_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET or PUSHER_SECRET");
  }
  return secret;
}

export function createSessionToken(roomId: string, playerId: string): string {
  const claims: SessionClaims = {
    roomId,
    playerId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionClaims;

    if (!claims.roomId || !claims.playerId || claims.exp < Date.now()) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

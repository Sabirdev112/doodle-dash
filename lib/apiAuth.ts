import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sessionToken";

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export function requireSession(
  req: NextRequest,
  roomId: string
): { playerId: string } | null {
  const token = getBearerToken(req);
  if (!token) return null;

  const claims = verifySessionToken(token);
  if (!claims || claims.roomId !== roomId) return null;

  return { playerId: claims.playerId };
}

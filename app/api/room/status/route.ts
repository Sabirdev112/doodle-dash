import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms";
import { checkStatusIpRateLimit } from "@/lib/rateLimit";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkStatusIpRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const roomId = req.nextUrl.searchParams.get("roomId")?.trim();
  if (!roomId || roomId.length < 6 || roomId.length > 12) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: Boolean(getRoom(roomId)) });
}

import { NextResponse } from "next/server";
import { validateDeploymentEnv } from "@/lib/env";
import { isRoomPersistenceEnabled } from "@/lib/roomPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    validateDeploymentEnv();
    const redisConfigured = isRoomPersistenceEnabled();
    return NextResponse.json({
      ok: true,
      service: "doodle-dash",
      realtime: "pusher",
      persistence: redisConfigured ? "redis" : "memory",
      ...(redisConfigured
        ? {}
        : {
            hint: "Set KV_REST_API_URL + KV_REST_API_TOKEN (Vercel Storage) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash console).",
          }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid deployment configuration";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

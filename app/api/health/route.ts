import { NextResponse } from "next/server";
import { validateDeploymentEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    validateDeploymentEnv();
    return NextResponse.json({
      ok: true,
      service: "doodle-dash",
      realtime: "pusher",
      persistence: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
        ? "redis"
        : "memory",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid deployment configuration";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

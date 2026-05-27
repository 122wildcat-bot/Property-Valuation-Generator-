import { NextResponse } from "next/server";

// Lightweight liveness probe. Public (no auth) so MVE / uptime monitors /
// curl can wake the service or confirm it's up without paying the cost of
// the full /api/generate pipeline. Returns immediately — no DB, no
// network, no Puppeteer. Use this for keep-warm pings.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, service: "pvrg" });
}

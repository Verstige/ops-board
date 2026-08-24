/**
 * Per-vendor analytics proxy. Forwards to /analytics/vendor/:vendorId
 * on the open-local API. Requires ops-board session.
 *
 * Env: OPEN_LOCAL_API_URL  → live upstream; otherwise returns 503.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vendorId } = await params;
  if (!/^\d+$/.test(vendorId)) {
    return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
  }

  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) {
    return NextResponse.json({
      error: "OPEN_LOCAL_API_URL not set",
      hint: "Vendor analytics requires live open-local connection. Set OPEN_LOCAL_API_URL in Railway.",
    }, { status: 503 });
  }

  try {
    const url = `${base}/api/analytics/vendor/${vendorId}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
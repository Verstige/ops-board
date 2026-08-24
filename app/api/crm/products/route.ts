/**
 * Product create proxy. Forwards POST to /api/products on the open-local
 * API. Requires ops-board session.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "OPEN_LOCAL_API_URL not set" }, { status: 503 });

  try {
    const url = `${base}/api/products`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `upstream ${res.status}`, detail: text }, { status: res.status });
    }
    return NextResponse.json(await res.json(), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
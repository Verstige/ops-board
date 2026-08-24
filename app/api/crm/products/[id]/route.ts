/**
 * Product mutation proxy. Forwards PATCH + DELETE to /api/products/:id
 * on the open-local API. Requires ops-board session.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "OPEN_LOCAL_API_URL not set" }, { status: 503 });

  try {
    const url = `${base}/api/products/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `upstream ${res.status}`, detail: text }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "OPEN_LOCAL_API_URL not set" }, { status: 503 });

  try {
    const url = `${base}/api/products/${id}`;
    const res = await fetch(url, { method: "DELETE", next: { revalidate: 0 } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `upstream ${res.status}`, detail: text }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
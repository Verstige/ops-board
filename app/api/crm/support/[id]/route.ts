/**
 * Support ticket PATCH proxy. Forwards status changes to
 * /admin/support/tickets/:id on the open-local API.
 * Requires ops-board session.
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
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !["open", "in_progress", "resolved"].includes(body.status)) {
    return NextResponse.json({ error: "status must be open|in_progress|resolved" }, { status: 400 });
  }

  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) {
    return NextResponse.json({
      error: "OPEN_LOCAL_API_URL not set",
      hint: "Support ticket mutations require live open-local connection.",
    }, { status: 503 });
  }

  try {
    const url = `${base}/api/admin/support/tickets/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ status: body.status }),
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `upstream ${res.status}`, detail: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
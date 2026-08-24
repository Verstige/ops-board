/**
 * CRM proxy — fetches the 6 open-local admin entities (Users,
 * Establishments, Vendors, Products, Webhooks, Support) and a derived
 * summary in one call.
 *
 * Env: OPEN_LOCAL_API_URL  → e.g. https://api.openlocal.com  (no trailing slash)
 * If unset or upstream fails, returns bundled lib/crm-fallback.json
 * so the CRM UI never breaks. 5-minute in-memory cache.
 *
 * Auth: ops-board session required (same as the rest of the app).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fallback from "@/lib/crm-fallback.json";

const CACHE_TTL_MS = 5 * 60 * 1000;
const ENTITIES = ["users", "establishments", "vendors", "products", "webhooks", "support"] as const;
type Entity = (typeof ENTITIES)[number];

type CacheEntry = {
  fetchedAt: number;
  source: "live" | "fallback";
  data: any;
};

let cache: CacheEntry | null = null;

async function fetchLive(): Promise<{ data: any; error?: string }> {
  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) return { data: null, error: "OPEN_LOCAL_API_URL not set" };

  const endpoints: Record<Entity, string> = {
    users: "/api/admin/users",
    establishments: "/api/admin/establishments",
    vendors: "/api/vendors?per_page=200",
    products: "/api/products?per_page=200",
    webhooks: "/api/admin/webhooks",
    support: "/api/admin/support/tickets",
  };

  try {
    const results = await Promise.all(
      ENTITIES.map(async (key) => {
        const url = `${base}${endpoints[key]}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          next: { revalidate: 0 },
        });
        if (!res.ok) return [key, null] as const;
        return [key, await res.json().catch(() => null)] as const;
      })
    );

    // If ANY entity failed, treat the whole batch as fallback
    const failures = results.filter(([, v]) => v === null);
    if (failures.length > 0) {
      return { data: null, error: `upstream failed for ${failures.map(([k]) => k).join(", ")}` };
    }

    const data: any = {};
    for (const [key, value] of results) data[key] = value;
    return { data };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

function summarize(data: any) {
  const totalUsers = data.users?.length ?? 0;
  const adminUsers = data.users?.filter((u: any) => u.role === "admin").length ?? 0;
  const vendorUsers = data.users?.filter((u: any) => u.role === "vendor").length ?? 0;

  const totalEstablishments = data.establishments?.length ?? 0;
  const activeEstablishments = data.establishments?.filter((e: any) => e.status === "active").length ?? 0;
  const trialEstablishments = data.establishments?.filter((e: any) => e.isTrial).length ?? 0;
  const pendingEstablishments = data.establishments?.filter((e: any) => e.status === "pending").length ?? 0;

  const totalVendors = data.vendors?.length ?? 0;
  const featuredVendors = data.vendors?.filter((v: any) => v.featured).length ?? 0;

  const totalProducts = data.products?.length ?? 0;
  const inStockProducts = data.products?.filter((p: any) => p.inStock).length ?? 0;
  const featuredProducts = data.products?.filter((p: any) => p.featured).length ?? 0;

  const totalWebhooks = data.webhooks?.length ?? 0;
  const activeWebhooks = data.webhooks?.filter((w: any) => w.active).length ?? 0;
  const failedDeliveries24h = data.webhooks?.reduce(
    (s: number, w: any) => s + (w.deliveriesLast24h && w.lastDeliveryStatus >= 400 ? w.deliveriesLast24h : 0),
    0
  ) ?? 0;

  const totalSupport = data.support?.length ?? 0;
  const openSupport = data.support?.filter((t: any) => t.status === "open").length ?? 0;
  const urgentSupport = data.support?.filter((t: any) => t.priority === "urgent").length ?? 0;

  return {
    users: { total: totalUsers, admins: adminUsers, vendors: vendorUsers },
    establishments: { total: totalEstablishments, active: activeEstablishments, trial: trialEstablishments, pending: pendingEstablishments },
    vendors: { total: totalVendors, featured: featuredVendors },
    products: { total: totalProducts, inStock: inStockProducts, featured: featuredProducts },
    webhooks: { total: totalWebhooks, active: activeWebhooks, failed24h: failedDeliveries24h },
    support: { total: totalSupport, open: openSupport, urgent: urgentSupport },
  };
}

async function getCRM(): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const live = await fetchLive();
  const data = live.data ?? fallback;
  const source: "live" | "fallback" = live.data ? "live" : "fallback";

  cache = {
    fetchedAt: Date.now(),
    source,
    data: { ...data, summary: summarize(data) },
  };
  return cache;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await getCRM();
  return NextResponse.json(entry, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
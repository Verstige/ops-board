/**
 * Markets proxy — fetches the live open-local vendor list and groups it
 * by region (FL/TX/GA/TN/NJ/SC/NC focus states).
 *
 * Env: OPEN_LOCAL_API_URL  → e.g. https://api.openlocal.com  (no trailing slash)
 * If unset or upstream fails, returns the bundled fallback snapshot so the
 * map never breaks. 5-minute in-memory cache to avoid hammering upstream.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fallback from "@/lib/markets-fallback.json";

const FOCUS_STATES = ["FL", "TX", "GA", "TN", "NJ", "SC", "NC"] as const;
type Region = (typeof FOCUS_STATES)[number];

type Vendor = {
  id: string | number;
  name: string;
  location: string;
  region: string;
  category: string;
  featured: boolean;
  slug: string;
};

type CacheEntry = {
  fetchedAt: number;
  source: "live" | "fallback";
  byRegion: Record<Region, Vendor[]>;
  totals: { vendors: number; featured: number; categories: number };
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: CacheEntry | null = null;

function emptyByRegion(): Record<Region, Vendor[]> {
  const out = {} as Record<Region, Vendor[]>;
  for (const s of FOCUS_STATES) out[s] = [];
  return out;
}

function aggregate(byRegion: Record<Region, Vendor[]>): CacheEntry["totals"] {
  let vendors = 0;
  let featured = 0;
  const cats = new Set<string>();
  for (const list of Object.values(byRegion)) {
    vendors += list.length;
    for (const v of list) {
      if (v.featured) featured++;
      cats.add(v.category);
    }
  }
  return { vendors, featured, categories: cats.size };
}

function normalize(v: any): Vendor | null {
  if (!v || typeof v !== "object") return null;
  const region = String(v.region || "").toUpperCase();
  if (!FOCUS_STATES.includes(region as Region)) return null;
  return {
    id: v.id ?? v.slug ?? `${region}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(v.name || "Unnamed vendor"),
    location: String(v.location || ""),
    region,
    category: String(v.category || "Other"),
    featured: Boolean(v.featured),
    slug: String(v.slug || ""),
  };
}

async function fetchLive(): Promise<{ byRegion: Record<Region, Vendor[]>; error?: string }> {
  const base = process.env.OPEN_LOCAL_API_URL?.replace(/\/+$/, "");
  if (!base) return { byRegion: emptyByRegion(), error: "OPEN_LOCAL_API_URL not set" };

  try {
    const url = `${base}/api/vendors?per_page=200`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { byRegion: emptyByRegion(), error: `upstream ${res.status}` };
    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return { byRegion: emptyByRegion(), error: "upstream not array" };

    const byRegion = emptyByRegion();
    for (const raw of data) {
      const v = normalize(raw);
      if (v) byRegion[v.region as Region].push(v);
    }
    // Sort each region: featured first, then alphabetical
    for (const region of FOCUS_STATES) {
      byRegion[region].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return { byRegion };
  } catch (e) {
    return { byRegion: emptyByRegion(), error: String(e) };
  }
}

function fromFallback(): Record<Region, Vendor[]> {
  const byRegion = emptyByRegion();
  for (const state of FOCUS_STATES) {
    const list = (fallback as any)[state];
    if (Array.isArray(list)) byRegion[state] = list.map((v: any) => normalize(v)!).filter(Boolean);
  }
  return byRegion;
}

async function getMarkets(): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const live = await fetchLive();
  let byRegion = live.byRegion;
  let source: "live" | "fallback" = "live";

  // If upstream failed OR returned empty, fall back to bundled snapshot
  const totalCount = Object.values(byRegion).reduce((s, l) => s + l.length, 0);
  if (live.error || totalCount === 0) {
    byRegion = fromFallback();
    source = "fallback";
  }

  cache = {
    fetchedAt: Date.now(),
    source,
    byRegion,
    totals: aggregate(byRegion),
  };
  return cache;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getMarkets();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
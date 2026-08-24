"use client";

import { useEffect, useMemo, useState } from "react";

type CrmData = {
  fetchedAt: number;
  source: "live" | "fallback";
  data: any;
};

const TABS = [
  { key: "overview",       label: "Overview" },
  { key: "analytics",      label: "Analytics" },
  { key: "marketplace",    label: "Marketplace" },
  { key: "establishments", label: "Establishments" },
  { key: "vendors",        label: "Vendors" },
  { key: "products",       label: "Products" },
  { key: "users",          label: "Users" },
  { key: "webhooks",       label: "Webhooks" },
  { key: "support",        label: "Support" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#f59e0b",
  rejected: "#ef4444",
  open: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
  admin: "#a78bfa",
  vendor: "#22c55e",
  shopper: "#6b7280",
  trial: "#f59e0b",
  pro: "#22c55e",
  starter: "#06b6d4",
  founder: "#a78bfa",
  free: "#6b7280",
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#6b7280",
};

function StatusBadge({ value }: { value: string }) {
  const color = STATUS_COLORS[value] ?? "#6b7280";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 999,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {value}
    </span>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="card glass-fade" style={{ borderTop: `2px solid ${color || "var(--brand-500)"}`, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color || "var(--brand-600)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="card glass-fade" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }} className="scroll-hide">{children}</div>
    </div>
  );
}

export default function CRMPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sourceLabel = data?.source === "live"
    ? "Live · open-local API"
    : data?.source === "fallback"
      ? "Snapshot · bundled fallback (set OPEN_LOCAL_API_URL for live data)"
      : "";

  const ageMin = data ? Math.round((Date.now() - data.fetchedAt) / 60000) : 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .11 — CRM
          </div>
          <h1 className="section-title">Customer & Vendor Hub</h1>
          <p className="section-subtitle">
            Mirror of the open-local admin — users, establishments, vendors, products, webhooks, support. Read-only.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {sourceLabel && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
              background: data?.source === "live"
                ? "color-mix(in srgb, #22c55e 14%, transparent)"
                : "color-mix(in srgb, #f59e0b 14%, transparent)",
              color: data?.source === "live" ? "#22c55e" : "#f59e0b",
              border: `1px solid color-mix(in srgb, ${data?.source === "live" ? "#22c55e" : "#f59e0b"} 30%, transparent)`,
            }}>
              {sourceLabel}
            </span>
          )}
          <button onClick={load} className="btn-ghost" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? "⟳ Loading…" : "⟳ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, padding: 18, borderLeft: "3px solid var(--status-blocked-fg)" }}>
          <div style={{ fontSize: 13, color: "var(--status-blocked-fg)" }}>⚠ {error}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="theme-toggle" style={{ padding: 3, marginBottom: 20, display: "inline-flex", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(""); }}
            className={tab === t.key ? "active" : ""}
            style={{ width: "auto", padding: "0 14px", textTransform: "capitalize", fontSize: 13, fontWeight: 500 }}
          >
            {t.label}
            {data?.data?.summary && (() => {
              const k = t.key as keyof typeof data.data.summary;
              const s = data.data.summary[k];
              if (s && typeof s === "object" && "total" in s) return <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>({s.total})</span>;
              return null;
            })()}
          </button>
        ))}
      </div>

      {/* Search (hidden on overview) */}
      {tab !== "overview" && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${tab}…`}
            style={{ width: "100%", maxWidth: 360 }}
          />
        </div>
      )}

      {/* Tab content */}
      {tab === "overview" && data && <Overview data={data} ageMin={ageMin} />}
      {tab === "analytics" && data && <Analytics vendors={data.data.vendors} liveSource={data.source === "live"} />}
      {tab === "marketplace" && data && <Marketplace stats={data.data.summary?.marketplace} />}
      {tab === "establishments" && data && <Establishments rows={data.data.establishments} search={search} />}
      {tab === "vendors" && data && <Vendors rows={data.data.vendors} search={search} liveSource={data.source === "live"} onChange={load} />}
      {tab === "products" && data && <Products rows={data.data.products} search={search} liveSource={data.source === "live"} vendors={data.data.vendors} onChange={load} />}
      {tab === "users" && data && <Users rows={data.data.users} search={search} />}
      {tab === "webhooks" && data && <Webhooks rows={data.data.webhooks} search={search} />}
      {tab === "support" && data && <Support rows={data.data.support} search={search} liveSource={data.source === "live"} onChange={load} />}
    </div>
  );
}

// ─── Tab renderers ────────────────────────────────────────────────────────────

function Overview({ data, ageMin }: { data: CrmData; ageMin: number }) {
  const s = data.data.summary;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPI label="Users"           value={s.users.total}          sub={`${s.users.admins} admin · ${s.users.vendors} vendor`} color="var(--brand-500)" />
        <KPI label="Establishments"  value={s.establishments.total} sub={`${s.establishments.active} active · ${s.establishments.pending} pending`} color="#22c55e" />
        <KPI label="Vendors"         value={s.vendors.total}        sub={`${s.vendors.featured} featured`} color="#f59e0b" />
        <KPI label="Products"        value={s.products.total}       sub={`${s.products.inStock} in stock`} color="#a78bfa" />
        <KPI label="Webhooks"        value={s.webhooks.total}       sub={`${s.webhooks.active} active`} color="#3b82f6" />
        <KPI label="Support"         value={s.support.total}        sub={`${s.support.open} open · ${s.support.urgent} urgent`} color={s.support.urgent > 0 ? "#ef4444" : "#06b6d4"} />
        <KPI label="Cache age"       value={`${ageMin}m`}           sub="5 min TTL" color="#6b7280" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <EstablishmentBreakdown rows={data.data.establishments} />
        <VendorBreakdown rows={data.data.vendors} />
        <ProductBreakdown rows={data.data.products} />
      </div>
    </>
  );
}

function EstablishmentBreakdown({ rows }: { rows: any[] }) {
  const byState: Record<string, number> = {};
  for (const e of rows ?? []) byState[e.state] = (byState[e.state] ?? 0) + 1;
  const entries = Object.entries(byState).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <div className="card glass-fade" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Establishments by state</h3>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map(([state, count]) => (
            <div key={state} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", width: 32 }}>{state}</span>
              <StatBar value={count} max={max} color="#22c55e" />
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 20 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorBreakdown({ rows }: { rows: any[] }) {
  const byCategory: Record<string, number> = {};
  for (const v of rows ?? []) byCategory[v.category] = (byCategory[v.category] ?? 0) + 1;
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const colors = ["#22c55e", "#f59e0b", "#a78bfa", "#3b82f6", "#06b6d4", "#ec4899", "#ef4444"];
  return (
    <div className="card glass-fade" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Vendors by category</h3>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map(([cat, count], i) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", minWidth: 80 }}>{cat}</span>
              <StatBar value={count} max={Math.max(...entries.map(([, n]) => n), 1)} color={colors[i % colors.length]} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 20 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductBreakdown({ rows }: { rows: any[] }) {
  const inStock = (rows ?? []).filter((p) => p.inStock).length;
  const total = (rows ?? []).length;
  const featured = (rows ?? []).filter((p) => p.featured).length;
  return (
    <div className="card glass-fade" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Product health</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="In stock"  value={inStock} max={total} color="#22c55e" />
        <Row label="Featured"  value={featured} max={total} color="#f59e0b" />
        <Row label="Out of stock" value={total - inStock} max={total} color="#ef4444" />
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
          Avg price: <strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            ${total > 0 ? ((rows ?? []).reduce((s, p) => s + (p.priceDollars ?? 0), 0) / total).toFixed(2) : "0.00"}
          </strong>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{value} / {max}</span>
      </div>
      <StatBar value={value} max={max} color={color} />
    </div>
  );
}

// ─── Analytics tab ──────────────────────────────────────────────────────────
// Per-vendor drilldown: 30-day visits, search appearances, product breakdown.
// Click a vendor row → fetches /api/crm/analytics/[id] for the detail.
function Analytics({ vendors, liveSource }: { vendors: any[]; liveSource: boolean }) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVendorId) {
      setAnalytics(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/crm/analytics/${selectedVendorId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || `HTTP ${res.status}`);
          setAnalytics(null);
        } else {
          setAnalytics(data);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedVendorId]);

  if (!liveSource) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
          Vendor analytics require a live open-local connection
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Set <code style={{ background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>OPEN_LOCAL_API_URL</code> in Railway. Per-vendor
          30-day visit data, search appearances, and product breakdowns will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 16 }} className="analytics-grid">
      {/* Vendor picker */}
      <div className="card glass-fade" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Pick a vendor</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }} className="scroll-hide">
          {(vendors ?? []).map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVendorId(String(v.id))}
              style={{
                textAlign: "left", padding: "10px 12px", borderRadius: 10,
                background: selectedVendorId === String(v.id) ? "color-mix(in srgb, var(--brand-500) 14%, transparent)" : "var(--glass-bg)",
                border: `1px solid ${selectedVendorId === String(v.id) ? "var(--brand-500)" : "var(--line)"}`,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "background 120ms",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.region} · {v.location}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="card glass-fade" style={{ padding: 20, minHeight: 400 }}>
        {!selectedVendorId ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 13 }}>Pick a vendor on the left to see 30-day analytics.</div>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading analytics…</div>
        ) : error ? (
          <div style={{ padding: 24, color: "var(--status-blocked-fg)" }}>⚠ {error}</div>
        ) : analytics ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-600)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                {analytics.vendor?.name ?? "Vendor"}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>30-day performance</h2>
            </div>

            {/* Visits KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
              <KPI label="Approved visits" value={analytics.visits?.approved ?? 0} sub="lifetime" color="#22c55e" />
              <KPI label="Pending" value={analytics.visits?.pending ?? 0} color="#f59e0b" />
              <KPI label="Rejected" value={analytics.visits?.rejected ?? 0} color="#ef4444" />
              <KPI label="Last 30 days" value={analytics.visits?.last30 ?? 0} sub="approved" color="var(--brand-500)" />
            </div>

            {/* Daily visits chart */}
            {analytics.visits?.daily && (
              <DailyBars data={analytics.visits.daily} label="Approved visits per day" />
            )}

            {/* Product breakdown */}
            {analytics.products && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Product breakdown
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                  <KPI label="Total" value={analytics.products.total ?? 0} color="var(--brand-500)" />
                  <KPI label="In stock" value={analytics.products.inStock ?? 0} color="#22c55e" />
                  <KPI label="Featured" value={analytics.products.featured ?? 0} color="#f59e0b" />
                  <KPI label="Batch drops" value={analytics.products.batchDrops ?? 0} color="#a78bfa" />
                  <KPI label="Surplus" value={analytics.products.surplus ?? 0} color="#06b6d4" />
                  <KPI label="Pre-orders" value={analytics.products.preOrders ?? 0} color="#ec4899" />
                </div>
              </div>
            )}

            {/* Search appearances */}
            {analytics.search && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Search appearances (30 days): {analytics.search.appearancesLast30 ?? 0}
                </div>
                {analytics.search.topMarketplaceQueries && analytics.search.topMarketplaceQueries.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {analytics.search.topMarketplaceQueries.slice(0, 5).map((q: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>"{q.query}"</span>
                        <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{q.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function DailyBars({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60, padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            style={{
              flex: 1,
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 2 : 0,
              background: d.count > 0 ? "var(--brand-500)" : "transparent",
              borderRadius: 2,
              opacity: d.count > 0 ? 0.8 : 0.2,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

// ─── Marketplace tab ─────────────────────────────────────────────────────────
function Marketplace({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
          No marketplace stats available
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          /api/stats endpoint returned no data. Check OPEN_LOCAL_API_URL.
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      <KPI label="Vendors"          value={stats.vendorCount ?? 0}      sub="total in marketplace" color="var(--brand-500)" />
      <KPI label="Featured vendors" value={stats.featuredVendorCount ?? 0} sub="promoted"         color="#f59e0b" />
      <KPI label="Products"         value={stats.productCount ?? 0}     sub="across all vendors"  color="#a78bfa" />
      <KPI label="In stock"         value={stats.inStockCount ?? 0}     sub={`of ${stats.productCount ?? 0}`} color="#22c55e" />
      <KPI label="Locations"        value={stats.locationCount ?? 0}    sub="unique"              color="#06b6d4" />
      <KPI label="Categories"       value={stats.categoryCount ?? 0}    sub="distinct"            color="#3b82f6" />
    </div>
  );
}

function filterRows<T extends Record<string, any>>(rows: T[], search: string): T[] {
  if (!search.trim()) return rows;
  const q = search.toLowerCase();
  return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
}

function Establishments({ rows, search }: { rows: any[]; search: string }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--glass-bg)" }}>
            {["Name", "Type", "Location", "Tier", "Status", "Stripe", "Created"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{e.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.contactEmail}</div>
              </td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{e.type}</td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{e.city}, {e.state}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge value={e.tier} /></td>
              <td style={{ padding: "10px 14px" }}>
                <StatusBadge value={e.status} />
                {e.isTrial && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-muted)" }}>(trial)</span>}
              </td>
              <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: e.stripeSubscriptionId ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {e.stripeSubscriptionId ? e.stripeSubscriptionId.slice(0, 12) + "…" : "—"}
              </td>
              <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(e.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function Vendors({ rows, search, liveSource, onChange }: { rows: any[]; search: string; liveSource: boolean; onChange: () => void }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFeatured, setEditFeatured] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function toggleFeatured(v: any) {
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/crm/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !v.featured }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || `HTTP ${res.status}`);
      } else {
        onChange();
      }
    } catch (e) {
      setEditError(String(e));
    } finally {
      setEditSaving(false);
      setEditingId(null);
    }
  }

  async function deleteVendor(v: any) {
    if (!confirm(`Delete vendor "${v.name}"? This cannot be undone (on the live open-local DB).`)) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/crm/vendors/${v.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || `HTTP ${res.status}`);
      } else {
        onChange();
      }
    } catch (e) {
      setEditError(String(e));
    } finally {
      setEditSaving(false);
      setEditingId(null);
    }
  }

  return (
    <TableWrap>
      {editError && (
        <div style={{
          padding: "8px 14px",
          background: "color-mix(in srgb, var(--status-blocked-fg) 14%, transparent)",
          color: "var(--status-blocked-fg)", fontSize: 12, fontWeight: 600,
          borderBottom: "1px solid var(--line)",
        }}>
          ⚠ {editError}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--glass-bg)" }}>
            {["Name", "Region", "Location", "Category", "Featured", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((v) => (
            <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.tagline}</div>
              </td>
              <td style={{ padding: "10px 14px" }}><StatusBadge value={v.region} /></td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{v.location}</td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{v.category}</td>
              <td style={{ padding: "10px 14px" }}>
                {liveSource ? (
                  <button
                    onClick={() => { setEditingId(String(v.id)); setEditFeatured(v.featured); toggleFeatured(v); }}
                    disabled={editSaving && editingId === String(v.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: v.featured ? "#f59e0b" : "var(--text-muted)",
                      fontSize: 12, fontWeight: 700,
                    }}
                    title="Click to toggle featured"
                  >
                    {v.featured ? "★ Featured" : "—"}
                  </button>
                ) : (
                  v.featured ? <span style={{ color: "#f59e0b" }}>★ Featured</span> : <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right" }}>
                {liveSource && (
                  <button
                    onClick={() => { setEditingId(String(v.id)); deleteVendor(v); }}
                    disabled={editSaving && editingId === String(v.id)}
                    className="btn-icon"
                    style={{ width: 24, height: 24, borderRadius: 7, color: "var(--status-blocked-fg)" }}
                    title="Delete vendor"
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>✕</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function Products({ rows, search, liveSource, vendors, onChange }: { rows: any[]; search: string; liveSource: boolean; vendors: any[]; onChange: () => void }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("bag");
  const [newCategory, setNewCategory] = useState("");
  const [newVendorId, setNewVendorId] = useState("");
  const [newFeatured, setNewFeatured] = useState(false);

  async function toggleProductField(p: any, field: "featured" | "inStock") {
    setBusyId(String(p.id));
    setActionError(null);
    try {
      const res = await fetch(`/api/crm/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !p[field] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || `HTTP ${res.status}`);
      } else {
        onChange();
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(p: any) {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    setBusyId(String(p.id));
    setActionError(null);
    try {
      const res = await fetch(`/api/crm/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || `HTTP ${res.status}`);
      } else {
        onChange();
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newVendorId || !newPrice || !newCategory.trim()) {
      setCreateError("Name, vendor, category, and price are required");
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/crm/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(newVendorId),
          name: newName.trim(),
          priceDollars: Number(newPrice),
          unit: newUnit.trim() || "bag",
          category: newCategory.trim(),
          inStock: true,
          featured: newFeatured,
          listingType: "regular",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || `HTTP ${res.status}`);
      } else {
        setShowCreate(false);
        setNewName(""); setNewPrice(""); setNewUnit("bag"); setNewCategory(""); setNewVendorId(""); setNewFeatured(false);
        onChange();
      }
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreateSaving(false);
    }
  }

  return (
    <>
      {liveSource && (
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>
            + New product
          </button>
        </div>
      )}

      {showCreate && (
        <div className="card glass-strong" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>New product</h3>
          {createError && (
            <div style={{
              padding: "8px 12px", marginBottom: 12, borderRadius: 8,
              background: "color-mix(in srgb, var(--status-blocked-fg) 14%, transparent)",
              color: "var(--status-blocked-fg)", fontSize: 12, fontWeight: 600,
            }}>
              ⚠ {createError}
            </div>
          )}
          <form onSubmit={createProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Valencia Oranges (5lb)" required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vendor *</label>
              <select value={newVendorId} onChange={(e) => setNewVendorId(e.target.value)} required>
                <option value="">Select…</option>
                {(vendors ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Category *</label>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Produce" required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Price ($) *</label>
              <input type="number" step="0.01" min="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="24.00" required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Unit</label>
              <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="bag" />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
              <input id="newFeatured" type="checkbox" checked={newFeatured} onChange={(e) => setNewFeatured(e.target.checked)} style={{ width: 16, height: 16 }} />
              <label htmlFor="newFeatured" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Mark as featured</label>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>Cancel</button>
              <button type="submit" disabled={createSaving} className="btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>
                {createSaving ? "Creating…" : "Create product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {actionError && (
        <div style={{
          padding: "8px 14px", marginBottom: 12, borderRadius: 8,
          background: "color-mix(in srgb, var(--status-blocked-fg) 14%, transparent)",
          color: "var(--status-blocked-fg)", fontSize: 12, fontWeight: 600,
        }}>
          ⚠ {actionError}
        </div>
      )}

      <TableWrap>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--glass-bg)" }}>
              {["Product", "Vendor", "Price", "Unit", "Category", "Stock", "Featured", "Type", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                  {p.featured && !liveSource && <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>★ Featured</span>}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: 11 }}>{p.vendorName}</td>
                <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 600 }}>
                  ${p.priceDollars.toFixed(2)}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{p.unit}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{p.category}</td>
                <td style={{ padding: "10px 14px" }}>
                  {liveSource ? (
                    <button
                      onClick={() => toggleProductField(p, "inStock")}
                      disabled={busyId === String(p.id)}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                        background: p.inStock ? "color-mix(in srgb, #22c55e 14%, transparent)" : "color-mix(in srgb, #ef4444 14%, transparent)",
                        color: p.inStock ? "#22c55e" : "#ef4444",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      {p.inStock ? "IN STOCK" : "OUT"}
                    </button>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                      background: p.inStock ? "color-mix(in srgb, #22c55e 14%, transparent)" : "color-mix(in srgb, #ef4444 14%, transparent)",
                      color: p.inStock ? "#22c55e" : "#ef4444",
                    }}>
                      {p.inStock ? "IN STOCK" : "OUT"}
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {liveSource ? (
                    <button
                      onClick={() => toggleProductField(p, "featured")}
                      disabled={busyId === String(p.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 700, color: p.featured ? "#f59e0b" : "var(--text-muted)" }}
                    >
                      {p.featured ? "★" : "—"}
                    </button>
                  ) : (
                    p.featured ? <span style={{ color: "#f59e0b" }}>★</span> : <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-muted)" }}>{p.listingType}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  {liveSource && (
                    <button
                      onClick={() => deleteProduct(p)}
                      disabled={busyId === String(p.id)}
                      className="btn-icon"
                      style={{ width: 24, height: 24, borderRadius: 7, color: "var(--status-blocked-fg)" }}
                      title="Delete product"
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>✕</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}

function Users({ rows, search }: { rows: any[]; search: string }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--glass-bg)" }}>
            {["Email", "Username", "Role", "Location", "Tier", "Stripe", "Joined"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600, fontSize: 12 }}>{u.email}</td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>@{u.username}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge value={u.role} /></td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{u.state} {u.zip}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge value={u.tier} /></td>
              <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: u.stripeSubscriptionId ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {u.stripeSubscriptionId ? u.stripeSubscriptionId.slice(0, 12) + "…" : "—"}
              </td>
              <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function Webhooks({ rows, search }: { rows: any[]; search: string }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--glass-bg)" }}>
            {["Label", "URL", "Events", "Active", "Last delivery", "24h"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((w) => (
            <tr key={w.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{w.label}</td>
              <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                {w.url.length > 50 ? w.url.slice(0, 47) + "…" : w.url}
              </td>
              <td style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {w.events.map((e: string) => (
                    <span key={e} style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 4, background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--line)" }}>
                      {e}
                    </span>
                  ))}
                </div>
              </td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  background: w.active ? "color-mix(in srgb, #22c55e 14%, transparent)" : "color-mix(in srgb, #6b7280 14%, transparent)",
                  color: w.active ? "#22c55e" : "#6b7280",
                }}>
                  {w.active ? "ACTIVE" : "PAUSED"}
                </span>
              </td>
              <td style={{ padding: "10px 14px", fontSize: 11 }}>
                <div style={{ color: "var(--text-secondary)" }}>{w.lastDeliveryAt ? timeAgo(w.lastDeliveryAt) : "—"}</div>
                {w.lastDeliveryStatus && (
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: w.lastDeliveryStatus < 300 ? "#22c55e" : "#ef4444",
                  }}>
                    HTTP {w.lastDeliveryStatus}
                  </div>
                )}
              </td>
              <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", textAlign: "right" }}>
                {w.deliveriesLast24h ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function Support({ rows, search, liveSource, onChange }: { rows: any[]; search: string; liveSource: boolean; onChange: () => void }) {
  const filtered = useMemo(() => filterRows(rows ?? [], search), [rows, search]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function setStatus(t: any, newStatus: string) {
    setBusyId(String(t.id));
    setActionError(null);
    try {
      const res = await fetch(`/api/crm/support/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || `HTTP ${res.status}`);
      } else {
        onChange();
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <TableWrap>
      {actionError && (
        <div style={{
          padding: "8px 14px",
          background: "color-mix(in srgb, var(--status-blocked-fg) 14%, transparent)",
          color: "var(--status-blocked-fg)", fontSize: 12, fontWeight: 600,
          borderBottom: "1px solid var(--line)",
        }}>
          ⚠ {actionError}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--glass-bg)" }}>
            {["Reference", "Subject", "Email", "Status", "Updated"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--brand-600)", fontWeight: 700 }}>{t.reference ?? `#${t.id}`}</td>
              <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{t.subject}</td>
              <td style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: 11 }}>{t.email}</td>
              <td style={{ padding: "10px 14px" }}>
                {liveSource ? (
                  <select
                    value={t.status}
                    onChange={(e) => setStatus(t, e.target.value)}
                    disabled={busyId === String(t.id)}
                    style={{ fontSize: 11, padding: "4px 8px", minWidth: 130 }}
                  >
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="resolved">resolved</option>
                  </select>
                ) : (
                  <StatusBadge value={t.status === "in_progress" ? "in_progress" : t.status} />
                )}
              </td>
              <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(t.updatedAt ?? t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
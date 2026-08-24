"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketMap } from "@/components/MarketMap";

type Vendor = {
  id: string;
  name: string;
  location: string;
  region: string;
  category: string;
  featured: boolean;
  slug: string;
};

type MarketsData = {
  fetchedAt: number;
  source: "live" | "fallback";
  byRegion: Record<string, Vendor[]>;
  totals: { vendors: number; featured: number; categories: number };
};

const STATE_NAMES: Record<string, string> = {
  FL: "Florida",
  TX: "Texas",
  GA: "Georgia",
  TN: "Tennessee",
  NJ: "New Jersey",
  SC: "South Carolina",
  NC: "North Carolina",
};

const STATE_COLORS: Record<string, string> = {
  FL: "#22c55e",
  TX: "#ef4444",
  GA: "#f59e0b",
  TN: "#ec4899",
  NJ: "#3b82f6",
  SC: "#a78bfa",
  NC: "#06b6d4",
};

export default function MarketsPage() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      // Auto-select the region with the most vendors on first load
      if (!selected) {
        const top = Object.entries(json.byRegion as Record<string, Vendor[]>)
          .filter(([, list]) => list.length > 0)
          .sort((a, b) => b[1].length - a[1].length)[0];
        if (top) setSelected(top[0]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRegion = selected ? data?.byRegion[selected] ?? [] : [];
  const featuredCount = selectedRegion.filter((v) => v.featured).length;
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of selectedRegion) counts[v.category] = (counts[v.category] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [selectedRegion]);

  const dataAgeMinutes = data ? Math.round((Date.now() - data.fetchedAt) / 60000) : 0;
  const sourceLabel = data?.source === "live"
    ? "Live · open-local API"
    : data?.source === "fallback"
      ? "Snapshot · bundled fallback (set OPEN_LOCAL_API_URL for live data)"
      : "";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .10 — Markets
          </div>
          <h1 className="section-title">Global Market Map</h1>
          <p className="section-subtitle">
            Active focus states across the Open Local network. Click a state to load its vendors.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {sourceLabel && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: "4px 10px", borderRadius: 999,
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
          <div style={{ fontSize: 13, color: "var(--status-blocked-fg)" }}>
            ⚠ Failed to load markets: {error}
          </div>
        </div>
      )}

      {/* Totals */}
      {data && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}>
          <div className="card glass-fade" style={{ borderTop: "2px solid var(--brand-500)", padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand-600)", marginBottom: 6 }}>Vendors</div>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{data.totals.vendors}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>Across focus states</div>
          </div>
          <div className="card glass-fade" style={{ borderTop: "2px solid #f59e0b", padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b", marginBottom: 6 }}>Featured</div>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{data.totals.featured}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>Highlighted vendors</div>
          </div>
          <div className="card glass-fade" style={{ borderTop: "2px solid #a78bfa", padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a78bfa", marginBottom: 6 }}>Categories</div>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{data.totals.categories}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>Distinct product types</div>
          </div>
          <div className="card glass-fade" style={{ borderTop: "2px solid #06b6d4", padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#06b6d4", marginBottom: 6 }}>Cached</div>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{dataAgeMinutes}m</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>5 min TTL on server</div>
          </div>
        </div>
      )}

      {/* Map + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16 }} className="markets-grid">
        <div className="card glass-fade" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Focus states</h2>
            {selected && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                background: `${STATE_COLORS[selected]}22`,
                color: STATE_COLORS[selected],
              }}>
                SELECTED · {selected}
              </span>
            )}
          </div>
          {data ? (
            <MarketMap byRegion={data.byRegion} selected={selected} onSelect={setSelected} />
          ) : (
            <div style={{ padding: 40, color: "var(--text-muted)", textAlign: "center", fontSize: 13 }}>
              {loading ? "Loading map…" : "No data"}
            </div>
          )}
        </div>

        <div className="card glass-fade" style={{ padding: 20, minHeight: 400 }}>
          {!selected ? (
            <div style={{ padding: 40, color: "var(--text-muted)", textAlign: "center" }}>
              <div style={{ fontSize: 13 }}>Click a state on the map to see its vendors.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: STATE_COLORS[selected] }}>
                  {STATE_NAMES[selected] ?? selected}
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{selected}</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginBottom: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span><strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{selectedRegion.length}</strong> vendors</span>
                <span><strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{featuredCount}</strong> featured</span>
                <span><strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{categoryCounts.length}</strong> categories</span>
              </div>

              {categoryCounts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                    Categories
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {categoryCounts.map(([cat, count]) => (
                      <span key={cat} style={{
                        fontSize: 11, fontWeight: 700,
                        background: "var(--glass-bg)",
                        border: "1px solid var(--line)",
                        color: "var(--text-secondary)",
                        padding: "3px 9px", borderRadius: 999,
                      }}>
                        {cat} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· {count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                Vendors
              </div>
              {selectedRegion.length === 0 ? (
                <div style={{
                  padding: 20, textAlign: "center",
                  border: "1px dashed var(--line)", borderRadius: 14,
                  color: "var(--text-muted)", fontSize: 12,
                }}>
                  No vendors in {STATE_NAMES[selected]} yet. Set OPEN_LOCAL_API_URL to pull live data.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }} className="scroll-hide">
                  {selectedRegion.map((v) => (
                    <div
                      key={v.id}
                      className="card glass-fade"
                      style={{
                        padding: 12,
                        borderLeft: `3px solid ${v.featured ? STATE_COLORS[selected] : "var(--line)"}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1, minWidth: 0 }}>
                          {v.name}
                        </span>
                        {v.featured && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                            background: `${STATE_COLORS[selected]}22`,
                            color: STATE_COLORS[selected],
                            textTransform: "uppercase", letterSpacing: "0.08em",
                          }}>
                            Featured
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {v.location} · {v.category}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .markets-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
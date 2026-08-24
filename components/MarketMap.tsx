"use client";

import { useMemo, useState } from "react";

type Vendor = {
  id: string;
  name: string;
  location: string;
  region: string;
  category: string;
  featured: boolean;
  slug: string;
};

type StateMeta = {
  code: string;
  name: string;
  /** SVG path data for the state outline. Coordinates inside a 600x400 viewBox. */
  d: string;
  /** Anchor point for the vendor count badge. */
  badge: { x: number; y: number };
  /** Center for hover/title. */
  center: { x: number; y: number };
  /** Brand color for this state on the map. */
  color: string;
};

// Simplified, recognizable-but-not-cartographic state outlines in a 600x400
// viewBox. Focus is on distinct shape + clear click target, not GIS accuracy.
// Coordinates roughly match US east-of-Mississippi, with FL sticking out.
const STATES: StateMeta[] = [
  {
    code: "FL",
    name: "Florida",
    d: "M 360 295 L 372 305 L 386 312 L 392 326 L 400 348 L 404 360 L 414 366 L 416 378 L 410 386 L 396 386 L 384 380 L 376 372 L 366 364 L 358 352 L 354 340 L 354 322 L 354 308 Z",
    badge: { x: 385, y: 348 },
    center: { x: 385, y: 340 },
    color: "#22c55e",
  },
  {
    code: "GA",
    name: "Georgia",
    d: "M 330 240 L 388 240 L 388 290 L 354 290 L 354 295 L 330 295 Z",
    badge: { x: 360, y: 265 },
    center: { x: 360, y: 265 },
    color: "#f59e0b",
  },
  {
    code: "SC",
    name: "South Carolina",
    d: "M 388 220 L 432 220 L 432 280 L 388 280 Z",
    badge: { x: 410, y: 250 },
    center: { x: 410, y: 250 },
    color: "#a78bfa",
  },
  {
    code: "NC",
    name: "North Carolina",
    d: "M 388 180 L 480 180 L 480 220 L 432 220 L 388 220 Z",
    badge: { x: 434, y: 200 },
    center: { x: 434, y: 200 },
    color: "#06b6d4",
  },
  {
    code: "TN",
    name: "Tennessee",
    d: "M 280 180 L 388 180 L 388 220 L 280 220 Z",
    badge: { x: 334, y: 200 },
    center: { x: 334, y: 200 },
    color: "#ec4899",
  },
  {
    code: "TX",
    name: "Texas",
    d: "M 120 240 L 230 240 L 240 290 L 230 340 L 200 360 L 170 360 L 150 340 L 130 310 L 120 280 Z",
    badge: { x: 180, y: 300 },
    center: { x: 180, y: 300 },
    color: "#ef4444",
  },
  {
    code: "NJ",
    name: "New Jersey",
    d: "M 524 150 L 552 150 L 552 200 L 524 200 Z",
    badge: { x: 538, y: 175 },
    center: { x: 538, y: 175 },
    color: "#3b82f6",
  },
];

export type MarketMapProps = {
  byRegion: Record<string, Vendor[]>;
  selected: string | null;
  onSelect: (code: string) => void;
};

export function MarketMap({ byRegion, selected, onSelect }: MarketMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of STATES) {
      out[s.code] = (byRegion[s.code] ?? []).length;
    }
    return out;
  }, [byRegion]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox="0 0 600 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "auto",
          maxHeight: 480,
          display: "block",
        }}
        role="img"
        aria-label="US states with active Open Local markets"
      >
        <defs>
          <filter id="map-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {STATES.map((s) => {
          const isSelected = selected === s.code;
          const isHovered = hovered === s.code;
          const count = counts[s.code] ?? 0;
          const isEmpty = count === 0;

          const fill = isSelected
            ? s.color
            : isHovered
              ? `${s.color}cc`
              : isEmpty
                ? "var(--glass-bg)"
                : `${s.color}55`;

          const stroke = isSelected
            ? s.color
            : isHovered
              ? s.color
              : "var(--line)";

          return (
            <g
              key={s.code}
              onClick={() => onSelect(s.code)}
              onMouseEnter={() => setHovered(s.code)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={`${s.name}: ${count} vendor${count === 1 ? "" : "s"}${isEmpty ? " (no vendors yet)" : ""}`}
            >
              <path
                d={s.d}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                style={{
                  transition: "fill 120ms, stroke 120ms",
                  filter: isSelected ? "url(#map-glow)" : undefined,
                }}
              />
              {/* Vendor count badge inside the state */}
              <g pointerEvents="none">
                <circle
                  cx={s.badge.x}
                  cy={s.badge.y}
                  r={14}
                  fill={isEmpty ? "var(--bg)" : s.color}
                  stroke={isSelected ? "white" : "var(--line)"}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={s.badge.x}
                  y={s.badge.y + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={isEmpty ? "var(--text-muted)" : "white"}
                  style={{ fontFamily: "var(--font-mono, monospace)" }}
                >
                  {count}
                </text>
                <text
                  x={s.badge.x}
                  y={s.badge.y + 28}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="var(--text-primary)"
                  style={{ fontFamily: "var(--font-sans, sans-serif)", letterSpacing: "0.08em" }}
                >
                  {s.code}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
        fontSize: 11,
        color: "var(--text-muted)",
      }}>
        <span style={{ fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Focus states:
        </span>
        {STATES.map((s) => (
          <button
            key={s.code}
            onClick={() => onSelect(s.code)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: selected === s.code ? s.color : "var(--glass-bg)",
              border: `1px solid ${selected === s.code ? s.color : "var(--line)"}`,
              color: selected === s.code ? "white" : "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 120ms",
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: selected === s.code ? "white" : s.color,
            }} />
            {s.code}
          </button>
        ))}
      </div>
    </div>
  );
}
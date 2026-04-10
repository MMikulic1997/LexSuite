import React from "react";

/**
 * LexicLogo — SVG recreation of the L-pillar + gold scales mark.
 * Renders white on dark (sidebar) backgrounds by default.
 * `size` controls the width; height scales proportionally.
 */
export default function LexicLogo({ size = 36, pillarColor = "#FFFFFF", scaleColor = "#C49A2A" }) {
  const height = Math.round(size * 46 / 56);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 56 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lexic"
      style={{ flexShrink: 0 }}
    >
      {/* ── Column / L-shape ───────────────────── */}

      {/* Entablature (top cap) */}
      <rect x="1" y="1" width="24" height="5.5" rx="2" fill={pillarColor} />

      {/* Column shafts × 3 */}
      <rect x="2.5"  y="6.5" width="4"   height="24" fill={pillarColor} />
      <rect x="9.5"  y="6.5" width="4"   height="24" fill={pillarColor} />
      <rect x="16.5" y="6.5" width="4"   height="24" fill={pillarColor} />

      {/* Stylobate (bottom cap of column) */}
      <rect x="1" y="30.5" width="24" height="4" rx="1.5" fill={pillarColor} />

      {/* Horizontal foot of L */}
      <rect x="1" y="34.5" width="33" height="7" rx="2" fill={pillarColor} />

      {/* Book / parallelogram at bottom-right of L */}
      <rect
        x="28" y="37"
        width="13" height="4.5"
        rx="1.5"
        fill={pillarColor}
        transform="rotate(-9 34.5 39.25)"
      />

      {/* ── Scales of Justice ──────────────────── */}

      {/* Vertical pole */}
      <rect x="39" y="17" width="2" height="18" rx="1" fill={scaleColor} />

      {/* Pivot knob */}
      <circle cx="40" cy="15" r="2.5" fill={scaleColor} />

      {/* Beam — left arm lower, right arm higher (classic weighing pose) */}
      <line
        x1="30" y1="19.5"
        x2="50" y2="16"
        stroke={scaleColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Left chain */}
      <line x1="30" y1="19.5" x2="30" y2="28" stroke={scaleColor} strokeWidth="1.2" strokeLinecap="round" />
      {/* Right chain */}
      <line x1="50" y1="16"   x2="50" y2="23" stroke={scaleColor} strokeWidth="1.2" strokeLinecap="round" />

      {/* Left pan (lower) */}
      <path
        d="M26.5 28 Q30 33 33.5 28"
        stroke={scaleColor} strokeWidth="1.5" strokeLinecap="round"
        fill={scaleColor} fillOpacity="0.4"
      />
      {/* Right pan (higher) */}
      <path
        d="M46.5 23 Q50 28 53.5 23"
        stroke={scaleColor} strokeWidth="1.5" strokeLinecap="round"
        fill={scaleColor} fillOpacity="0.4"
      />

      {/* Pole foot */}
      <rect x="37.5" y="34.5" width="5" height="1.5" rx=".75" fill={scaleColor} />
    </svg>
  );
}

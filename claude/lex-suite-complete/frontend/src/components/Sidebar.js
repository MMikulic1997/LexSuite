import React, { useState } from "react";
import LexicLogo from "./LexicLogo";

// ── Inline SVG icons (no external dependency) ─────────────────────────────

function IconCases() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <line x1="9" y1="2.5" x2="9" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="5.5" x2="14" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4"  y1="5.5" x2="4"  y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="5.5" x2="14" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 10.5 Q4 14 6 10.5"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 10.5 Q14 14 16 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="currentColor" fillOpacity="0.18" />
      <line x1="7" y1="15.5" x2="11" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6"  y1="2" x2="6"  y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6.5"  cy="11.5" r="1" fill="currentColor" />
      <circle cx="9.5"  cy="11.5" r="1" fill="currentColor" />
      <circle cx="12.5" cy="11.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M9 11.5L5 7.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M6 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav items config ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "svi_predmeti", label: "Cases",    icon: <IconCases />,    activeIds: ["svi_predmeti", "predmet"] },
  { id: "rokovnik",     label: "Calendar", icon: <IconCalendar />, activeIds: ["rokovnik"] },
  { id: "klijenti",     label: "Clients",  icon: <IconClients />,  activeIds: ["klijenti", "klijent"] },
];

// ── Sidebar component ──────────────────────────────────────────────────────

export default function Sidebar({ nav, onNavigate, onSettings }) {
  const [collapsed, setCollapsed] = useState(false);

  const W_EXPANDED  = 220;
  const W_COLLAPSED = 56;
  const width    = collapsed ? W_COLLAPSED : W_EXPANDED;
  const minWidth = collapsed ? W_COLLAPSED : W_EXPANDED;

  const isActive = (item) => item.activeIds.includes(nav);

  return (
    <aside
      style={{
        width,
        minWidth,
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
        borderRight: "none",
        zIndex: 10,
      }}
    >
      {/* ── Logo header ─────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "22px 0 18px" : "22px 14px 18px 20px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          transition: "padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 72,
        }}
      >
        {/* Logo + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            minWidth: 0,
          }}
          onClick={() => onNavigate("klijenti")}
        >
          <LexicLogo size={32} />

          {/* "Lexic" wordmark — fades out when collapsed */}
          <div
            style={{
              overflow: "hidden",
              maxWidth: collapsed ? 0 : 140,
              opacity: collapsed ? 0 : 1,
              transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-.2px",
                lineHeight: 1,
                display: "block",
              }}
            >
              O.D. Mikulić Nikolić
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,.28)",
                letterSpacing: "1.3px",
                textTransform: "uppercase",
                display: "block",
                marginTop: 3,
              }}
            >
              Odvjetničko društvo
            </span>
          </div>
        </div>

        {/* Collapse / expand toggle — hidden when collapsed (shown separately) */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,.3)",
              padding: "4px 5px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              transition: "color .15s, background .15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,.7)";
              e.currentTarget.style.background = "rgba(255,255,255,.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,.3)";
              e.currentTarget.style.background = "none";
            }}
            title="Collapse sidebar"
          >
            <IconChevronLeft />
          </button>
        )}
      </div>

      {/* ── Expand button (visible only when collapsed) ── */}
      {collapsed && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 2 }}>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,.3)",
              padding: "5px 6px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              transition: "color .15s, background .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,.7)";
              e.currentTarget.style.background = "rgba(255,255,255,.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,.3)";
              e.currentTarget.style.background = "none";
            }}
            title="Expand sidebar"
          >
            <IconChevronRight />
          </button>
        </div>
      )}

      {/* ── Navigation items ────────────────────── */}
      <nav style={{ padding: "10px 0", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 10,
                width: "100%",
                padding: collapsed ? "11px 0" : "10px 20px",
                background: active ? "var(--sidebar-active)" : "none",
                border: "none",
                borderLeft: `2px solid ${active ? "var(--gold-light)" : "transparent"}`,
                cursor: "pointer",
                color: active ? "#FFFFFF" : "rgba(255,255,255,.48)",
                fontFamily: "var(--font-body)",
                fontSize: 13.5,
                fontWeight: active ? 500 : 400,
                textAlign: "left",
                letterSpacing: "-.1px",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--sidebar-hover)";
                  e.currentTarget.style.color = "rgba(255,255,255,.82)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "rgba(255,255,255,.48)";
                }
              }}
            >
              {/* Icon */}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  flexShrink: 0,
                  color: active ? "var(--gold-light)" : "currentColor",
                  transition: "color .15s",
                }}
              >
                {item.icon}
              </span>

              {/* Label — slides away when collapsed */}
              <span
                style={{
                  overflow: "hidden",
                  maxWidth: collapsed ? 0 : 160,
                  opacity: collapsed ? 0 : 1,
                  transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.12s ease",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,.06)",
          overflow: "hidden",
        }}
      >
        {/* Settings button */}
        <button
          onClick={onSettings}
          title={collapsed ? "Settings" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 10,
            width: "100%",
            padding: collapsed ? "13px 0" : "12px 20px",
            background: nav === "settings" ? "var(--sidebar-active)" : "none",
            border: "none",
            borderLeft: `2px solid ${nav === "settings" ? "var(--gold-light)" : "transparent"}`,
            cursor: "pointer",
            color: nav === "settings" ? "#FFFFFF" : "rgba(255,255,255,.48)",
            fontFamily: "var(--font-body)",
            fontSize: 13.5,
            fontWeight: nav === "settings" ? 500 : 400,
            textAlign: "left",
            transition: "all .15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (nav !== "settings") {
              e.currentTarget.style.background = "var(--sidebar-hover)";
              e.currentTarget.style.color = "rgba(255,255,255,.82)";
            }
          }}
          onMouseLeave={(e) => {
            if (nav !== "settings") {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "rgba(255,255,255,.48)";
            }
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              flexShrink: 0,
              color: nav === "settings" ? "var(--gold-light)" : "currentColor",
              transition: "color .15s",
            }}
          >
            <IconSettings />
          </span>
          <span
            style={{
              overflow: "hidden",
              maxWidth: collapsed ? 0 : 160,
              opacity: collapsed ? 0 : 1,
              transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.12s ease",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            Settings
          </span>
        </button>

        {/* Version / logo */}
        <div style={{ padding: collapsed ? "10px 0" : "10px 20px", transition: "padding 0.25s cubic-bezier(0.4,0,0.2,1)" }}>
          <div
            style={{
              overflow: "hidden",
              maxWidth: collapsed ? 0 : 200,
              opacity: collapsed ? 0 : 1,
              transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.12s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.18)", letterSpacing: ".3px" }}>
              LexSuite MVP v0.1
            </span>
          </div>
          {collapsed && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <LexicLogo size={20} scaleColor="rgba(196,154,42,0.4)" pillarColor="rgba(255,255,255,0.15)" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

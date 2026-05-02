import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import PredmetPage from "./pages/PredmetPage";
import SviPredmetiPage from "./pages/SviPredmetiPage";
import RokovnikPage from "./pages/RokovnikPage";
import KlijentiPage from "./pages/KlijentiPage";
import KlijentPage from "./pages/KlijentPage";
import SettingsPage from "./pages/SettingsPage";
import PregledPage from "./pages/PregledPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

function parseJwtPayload(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="3"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8" x2="3" y2="8"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.9" y1="2.9" x2="4.3" y2="4.3"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.7" y1="11.7" x2="13.1" y2="13.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.9" y1="13.1" x2="4.3" y2="11.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.7" y1="4.3" x2="13.1" y2="2.9"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem("lexsuite_token"));
  const isAdmin = (() => {
    const token = localStorage.getItem("lexsuite_token");
    return token ? parseJwtPayload(token)?.role === "admin" : false;
  })();
  const [nav, setNav]                     = useState("pregled");
  const [selectedId, setSelectedId]       = useState(null);
  const [selectedKlijentId, setSelectedKlijentId] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("lexic-dark") === "true");

  const handleLogin = () => setLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem("lexsuite_token");
    setLoggedIn(false);
    setNav("pregled");
    setSelectedId(null);
    setSelectedKlijentId(null);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("lexic-dark", dark);
  }, [dark]);

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;

  const handleSelectPredmet = (id) => {
    setSelectedId(id);
    setNav("predmet");
  };

  const handleBackFromPredmet = () => {
    setSelectedId(null);
    setNav("predmeti");
  };

  const handleSelectKlijent = (id) => {
    setSelectedKlijentId(id);
    setNav("klijent");
  };

  const handleBackFromKlijent = () => {
    setSelectedKlijentId(null);
    setNav("klijenti");
  };

  // When navigating to a predmet from klijent page, keep klijent in history via nav
  const handleSelectPredmetFromKlijent = (id) => {
    setSelectedId(id);
    setNav("predmet");
  };

  const handleSettings = () => setNav("settings");
  const handleChangePassword = () => setNav("change_password");

  const navigate = (id) => {
    if (id === "klijenti") { handleBackFromKlijent(); }
    else { setNav(id); }
  };

  return (
    <div className="layout">
      <Sidebar nav={nav} onNavigate={navigate} onSettings={handleSettings} onChangePassword={handleChangePassword} onLogout={handleLogout} isAdmin={isAdmin} />

      <main className="main">
        <div className="topbar">
          <span className="topbar-firm">O.D. Mikulić Nikolić</span>
          <div className="topbar-actions">
            {/* Notifikacije */}
            <div style={{ position: "relative", display: "flex" }}>
              <button className="topbar-icon-btn" title="Notifikacije">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 2a5.5 5.5 0 0 0-5.5 5.5c0 2.5-.8 3.8-1.5 4.5h14c-.7-.7-1.5-2-1.5-4.5A5.5 5.5 0 0 0 9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M7.5 14.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              <span style={{
                position: "absolute", top: 2, right: 2,
                minWidth: 15, height: 15, borderRadius: 8,
                background: "var(--red)", color: "#fff",
                fontSize: 9, fontWeight: 700, lineHeight: "15px", textAlign: "center",
                padding: "0 3px", pointerEvents: "none",
                border: "1.5px solid var(--surface)",
              }}>3</span>
            </div>

            {/* Poruke */}
            <div style={{ position: "relative", display: "flex" }}>
              <button className="topbar-icon-btn" title="Poruke">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h11A1.5 1.5 0 0 1 16 3.5v8A1.5 1.5 0 0 1 14.5 13H6l-4 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </button>
              <span style={{
                position: "absolute", top: 2, right: 2,
                minWidth: 15, height: 15, borderRadius: 8,
                background: "var(--blue)", color: "#fff",
                fontSize: 9, fontWeight: 700, lineHeight: "15px", textAlign: "center",
                padding: "0 3px", pointerEvents: "none",
                border: "1.5px solid var(--surface)",
              }}>1</span>
            </div>

            <button className="dark-toggle" onClick={() => setDark(!dark)} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <IconSun /> : <IconMoon />}
            </button>
            <div
              title="O.D. Mikulić Nikolić"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#1C1C1E", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, letterSpacing: ".5px",
                flexShrink: 0, userSelect: "none",
              }}
            >
              MN
            </div>
          </div>
        </div>

        <div className="page-content">
        {nav === "pregled"
          ? <PregledPage onSelectPredmet={handleSelectPredmet} />
          : nav === "predmet" && selectedId
          ? <PredmetPage predmetId={selectedId} onBack={handleBackFromPredmet} onSelectKlijent={handleSelectKlijent} />
          : nav === "klijent" && selectedKlijentId
          ? <KlijentPage
              klijentId={selectedKlijentId}
              onBack={handleBackFromKlijent}
              onSelectPredmet={handleSelectPredmetFromKlijent}
            />
          : nav === "klijenti"
          ? <KlijentiPage onSelect={handleSelectKlijent} onSelectPredmet={handleSelectPredmet} />
          : nav === "rokovnik"
          ? <RokovnikPage onSelectPredmet={handleSelectPredmet} />
          : nav === "svi_predmeti"
          ? <SviPredmetiPage onSelectPredmet={handleSelectPredmet} onSelectKlijent={handleSelectKlijent} />
          : nav === "settings"
          ? <SettingsPage />
          : nav === "change_password"
          ? <ChangePasswordPage onBack={() => setNav("pregled")} />
          : nav === "klijenti"
          ? <KlijentiPage onSelect={handleSelectKlijent} onSelectPredmet={handleSelectPredmet} />
          : <PregledPage onSelectPredmet={handleSelectPredmet} />
        }
        </div>
      </main>
    </div>
  );
}

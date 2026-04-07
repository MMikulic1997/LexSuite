import React, { useState } from "react";
import PredmetiPage from "./pages/PredmetiPage";
import PredmetPage from "./pages/PredmetPage";
import RokovnikPage from "./pages/RokovnikPage";
import KlijentiPage from "./pages/KlijentiPage";
import KlijentPage from "./pages/KlijentPage";

export default function App() {
  const [nav, setNav]                     = useState("predmeti");
  const [selectedId, setSelectedId]       = useState(null);
  const [selectedKlijentId, setSelectedKlijentId] = useState(null);

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

  const isPredmetiActive = nav === "predmeti" || nav === "predmet";
  const isKlijentiActive = nav === "klijenti" || nav === "klijent";

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>LexSuite</h1>
          <p>Odvjetnička pisarnica</p>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-btn${isPredmetiActive ? " active" : ""}`}
            onClick={handleBackFromPredmet}
          >
            <span className="nav-icon">⚖️</span> Predmeti
          </button>
          <button
            className={`nav-btn${isKlijentiActive ? " active" : ""}`}
            onClick={handleBackFromKlijent}
          >
            <span className="nav-icon">👤</span> Klijenti
          </button>
          <button
            className={`nav-btn${nav === "rokovnik" ? " active" : ""}`}
            onClick={() => setNav("rokovnik")}
          >
            <span className="nav-icon">📅</span> Rokovnik
          </button>
          <button className="nav-btn" disabled style={{ opacity: .4, cursor: "default" }}>
            <span className="nav-icon">📊</span> Statistika <span style={{ fontSize: 10, marginLeft: "auto", opacity: .6 }}>uskoro</span>
          </button>
          <button className="nav-btn" disabled style={{ opacity: .4, cursor: "default" }}>
            <span className="nav-icon">🔔</span> Obavijesti <span style={{ fontSize: 10, marginLeft: "auto", opacity: .6 }}>uskoro</span>
          </button>
        </nav>
        <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 11, color: "rgba(255,255,255,.25)" }}>
          LexSuite MVP v0.1
        </div>
      </aside>

      <main className="main">
        {nav === "predmet" && selectedId
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
          : <PredmetiPage onSelect={handleSelectPredmet} />
        }
      </main>
    </div>
  );
}

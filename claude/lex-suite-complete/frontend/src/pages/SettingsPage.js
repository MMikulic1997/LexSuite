import React from "react";

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Postavke ureda</h2>
          <p>Konfiguracija i upravljanje uredom</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
          <p style={{ fontSize: 16, color: "var(--ink-2)", margin: "0 0 8px", fontWeight: 500 }}>Uskoro dostupno</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
            Ovdje će biti dostupne postavke ureda, korisnika i sustava.
          </p>
        </div>
      </div>
    </div>
  );
}

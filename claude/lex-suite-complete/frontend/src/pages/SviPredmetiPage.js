import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { getStrankeOrder } from "../utils/strankeUtils";

export default function SviPredmetiPage({ onSelectPredmet, onSelectKlijent }) {
  const [predmeti, setPredmeti] = useState([]);
  const [filter, setFilter]     = useState("");

  useEffect(() => { api.getPredmeti().then(setPredmeti); }, []);

  const q = filter.trim().toLowerCase();
  const filtered = !q ? predmeti : predmeti.filter((p) =>
    p.oznaka.toLowerCase().includes(q) ||
    (p.nazivPredmeta  && p.nazivPredmeta.toLowerCase().includes(q)) ||
    (p.stranka?.ime    && p.stranka.ime.toLowerCase().includes(q)) ||
    (p.protustranka?.ime && p.protustranka.ime.toLowerCase().includes(q)) ||
    (p.stranka?.oib    && p.stranka.oib.includes(q)) ||
    (p.protustranka?.oib && p.protustranka.oib.includes(q)) ||
    (p.klijent?.naziv && p.klijent.naziv.toLowerCase().includes(q)) ||
    (p.klijent?.oib   && p.klijent.oib.includes(q)) ||
    (p.sud            && p.sud.toLowerCase().includes(q)) ||
    (p.poslovniBroj   && p.poslovniBroj.toLowerCase().includes(q))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Svi predmeti</h2>
          <p>Svi predmeti ureda – {predmeti.length} ukupno</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <input
            style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px", fontSize: 13, width: 320 }}
            placeholder="Pretraži po oznaci, strankama, klijentu, OIB-u, sudu..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
          {q && (
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
              {filtered.length} {filtered.length === 1 ? "rezultat" : "rezultata"}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⚖️</div>
            <p>{q ? "Nema predmeta koji odgovaraju pretrazi." : "Nema predmeta u sustavu."}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Oznaka</th>
                <th>Naziv predmeta</th>
                <th>Stranke</th>
                <th>Klijent</th>
                <th>Uloga</th>
                <th>Sud</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onSelectPredmet(p.id)}>
                  <td>
                    <div className="oznaka">{p.oznaka}</div>
                    {p.poslovniBroj && (
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{p.poslovniBroj}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{p.nazivPredmeta || <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                  <td>
                    {p.vrsta === "SPORNI" ? (() => {
                      const { lijevo, desno } = getStrankeOrder(p);
                      return (
                        <>
                          <div style={{ fontSize: 13 }}>
                            {lijevo.ime}
                            {lijevo.uloga && <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 5 }}>· {lijevo.uloga}</span>}
                          </div>
                          {desno.ime && (
                            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                              c/a {desno.ime}
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <div style={{ fontSize: 13 }}>{p.stranka?.ime}</div>
                    )}
                  </td>
                  <td>
                    {p.klijent ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectKlijent(p.klijent.id); }}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          color: "var(--gold)", fontWeight: 500, fontSize: 13, textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                      >
                        {p.klijent.naziv}
                      </button>
                    ) : (
                      <span style={{ color: "var(--ink-4)" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {p.klijent ? (p.ulogaKlijenta || "—") : <span style={{ color: "var(--ink-4)" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{p.sud || "—"}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

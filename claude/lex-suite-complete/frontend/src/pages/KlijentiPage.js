import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import KlijentModal from "../components/KlijentModal";

const TIP_LABEL = { fizicka: "Fizička osoba", pravna: "Pravna osoba" };

const STATUS_COLOR = {
  aktivan:   { bg: "#e8f5e9", color: "#2e7d32" },
  zatvoren:  { bg: "#f5f5f5", color: "#757575" },
  mirovanje: { bg: "#fff8e1", color: "#f57f17" },
};

function formatDatum(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("hr-HR");
}

export default function KlijentiPage({ onSelect, onSelectPredmet }) {
  const [view, setView]         = useState("tablica"); // "tablica" | "pregled"
  const [klijenti, setKlijenti] = useState([]);
  const [pregled, setPregled]   = useState([]);
  const [filter, setFilter]     = useState("");
  const [modal, setModal]       = useState(null);

  const loadTablica = () => api.getKlijenti().then(setKlijenti);
  const loadPregled = () => api.getKlijentiPregled().then(setPregled);

  useEffect(() => { loadTablica(); }, []);
  useEffect(() => {
    if (view === "pregled" && pregled.length === 0) loadPregled();
  }, [view]);

  const handleCreate = async (data) => {
    await api.createKlijent(data);
    await loadTablica();
    if (view === "pregled") loadPregled();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Obrisati klijenta?")) return;
    await api.deleteKlijent(id);
    loadTablica();
    if (view === "pregled") loadPregled();
  };

  const filteredTablica = klijenti.filter((k) => {
    const q = filter.toLowerCase();
    return !q || k.naziv.toLowerCase().includes(q) || k.oib.includes(q);
  });

  const filteredPregled = pregled.filter((k) => {
    const q = filter.toLowerCase();
    return !q || k.naziv.toLowerCase().includes(q) || k.oib.includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Klijenti</h2>
          <p>Imenik svih klijenata ureda</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
            <input
              style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px", fontSize: 13, width: 240 }}
              placeholder="Pretraži po imenu ili OIB-u..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              {[["tablica","Tablica"],["pregled","Pregled"]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "7px 14px", fontSize: 13, border: "none", cursor: "pointer",
                    background: view === v ? "var(--button-bg)" : "transparent",
                    color: view === v ? "var(--button-text)" : "var(--ink-3)",
                    fontWeight: view === v ? 600 : 400,
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal("new")}>+ Novi klijent</button>
        </div>

        {/* ── Tablica view ── */}
        {view === "tablica" && (
          filteredTablica.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👤</div>
              <p>{filter ? "Nema rezultata pretrage." : "Još nema klijenata. Dodajte prvog."}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Tip</th>
                  <th>OIB</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTablica.map((k) => (
                  <tr key={k.id} style={{ cursor: "pointer" }} onClick={() => onSelect(k.id)}>
                    <td style={{ fontWeight: 500 }}>{k.naziv}</td>
                    <td>
                      <span style={{ fontSize: 12, background: "var(--border)", borderRadius: 4, padding: "2px 7px" }}>
                        {TIP_LABEL[k.tip] || k.tip}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: k.oib ? "var(--ink)" : "var(--ink-3)", fontFamily: "monospace" }}>
                      {k.oib || "—"}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--ink-3)" }}>{k.email || "—"}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-3)" }}>{k.telefon || "—"}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(k.id, e)}>Briši</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Pregled view ── */}
        {view === "pregled" && (
          <div style={{ padding: "16px 20px" }}>
            {filteredPregled.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">👤</div>
                <p>{filter ? "Nema rezultata pretrage." : "Još nema klijenata."}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredPregled.map((k) => (
                  <div key={k.id} style={{
                    border: "1px solid var(--border)", borderRadius: 8,
                    background: "var(--surface)", overflow: "hidden",
                  }}>
                    {/* Client header row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", borderBottom: k.predmeti.length > 0 ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                    }}
                      onClick={() => onSelect(k.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{k.naziv}</span>
                        {k.oib && <span style={{ marginLeft: 10, fontSize: 12, color: "var(--ink-3)", fontFamily: "monospace" }}>{k.oib}</span>}
                      </div>
                      <span style={{ fontSize: 12, background: "var(--border)", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
                        {TIP_LABEL[k.tip] || k.tip}
                      </span>
                      {k.predmeti.length > 0 && (
                        <span style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}>
                          {k.predmeti.length} {k.predmeti.length === 1 ? "predmet" : "predmeta"}
                        </span>
                      )}
                      {k.sljedeciRok && (
                        <span style={{
                          fontSize: 12, background: "#fff8e1", color: "#b45309",
                          borderRadius: 4, padding: "2px 8px", flexShrink: 0, fontWeight: 500,
                        }}>
                          Rok: {formatDatum(k.sljedeciRok.datum)}
                        </span>
                      )}
                    </div>

                    {/* Predmeti rows */}
                    {k.predmeti.length > 0 && (
                      <div>
                        {k.predmeti.map((p, i) => {
                          const sc = STATUS_COLOR[p.status] || {};
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 16px 9px 32px",
                                borderBottom: i < k.predmeti.length - 1 ? "1px solid var(--border)" : "none",
                                cursor: onSelectPredmet ? "pointer" : "default",
                                background: "var(--surface-2)",
                              }}
                              onClick={() => onSelectPredmet?.(p.id)}
                            >
                              <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: "var(--ink)" }}>{p.oznaka}</span>
                              <span className={`badge badge-${p.vrsta.toLowerCase()}`} style={{ fontSize: 11 }}>{p.vrsta}</span>
                              <span style={{ flex: 1 }} />
                              <span style={{
                                fontSize: 11, borderRadius: 4, padding: "2px 8px",
                                background: sc.bg, color: sc.color, fontWeight: 500,
                              }}>
                                {p.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {k.predmeti.length === 0 && (
                      <div style={{ padding: "10px 16px 10px 32px", fontSize: 13, color: "var(--ink-3)", background: "var(--surface-2)" }}>
                        Nema predmeta
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modal === "new" && <KlijentModal onSave={handleCreate} onClose={() => setModal(null)} />}
    </div>
  );
}

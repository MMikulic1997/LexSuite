import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import NovPredmetModal from "../components/NovPredmetModal";

export default function PredmetiPage({ onSelect }) {
  const [predmeti, setPredmeti] = useState([]);
  const [klijenti, setKlijenti] = useState([]);
  const [modal, setModal]       = useState(false);
  const [filter, setFilter]     = useState("");
  const [klijentFilter, setKlijentFilter] = useState(""); // klijentId | ""

  const load = () => Promise.all([
    api.getPredmeti().then(setPredmeti),
    api.getKlijenti().then(setKlijenti),
  ]);
  useEffect(() => { load(); }, []);

  const handleCreate = async (data) => {
    const p = await api.createPredmet(data);
    await load();
    onSelect(p.id);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Sigurno želite zatvoriti/obrisati ovaj predmet?")) return;
    await api.deletePredmet(id);
    load();
  };

  const filtered = predmeti.filter((p) => {
    if (klijentFilter && p.klijentId !== klijentFilter) return false;
    const q = filter.toLowerCase();
    return !q || p.oznaka.toLowerCase().includes(q)
              || p.tuzitelj.ime.toLowerCase().includes(q)
              || p.tuzeni.ime.toLowerCase().includes(q)
              || p.klijent?.naziv.toLowerCase().includes(q);
  });

  const formatDatum = (iso) => new Date(iso).toLocaleDateString("hr-HR");

  const selectedKlijent = klijentFilter ? klijenti.find((k) => k.id === klijentFilter) : null;

  return (
    <div>
      <div className="page-header">
        <h2>Predmeti</h2>
        <p>Svi otvoreni i zatvoreni predmeti ureda</p>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
            <input
              style={{ border: "1px solid var(--cream)", borderRadius: 6, padding: "7px 12px", fontSize: 13, width: 220 }}
              placeholder="Pretraži po oznaci ili stranci..."
              value={filter} onChange={(e) => setFilter(e.target.value)}
            />
            <select
              style={{ border: "1px solid var(--cream)", borderRadius: 6, padding: "7px 12px", fontSize: 13, minWidth: 180 }}
              value={klijentFilter}
              onChange={(e) => setKlijentFilter(e.target.value)}
            >
              <option value="">Svi klijenti</option>
              {klijenti.map((k) => (
                <option key={k.id} value={k.id}>{k.naziv}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novi predmet</button>
        </div>

        {selectedKlijent && (
          <div style={{
            padding: "8px 20px", background: "var(--parchment)", borderBottom: "1px solid var(--cream)",
            fontSize: 13, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8,
          }}>
            Filtrirano po klijentu: <strong style={{ color: "var(--ink)" }}>{selectedKlijent.naziv}</strong>
            <button
              onClick={() => setKlijentFilter("")}
              style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ink-3)" }}
            >× ukloni filter</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⚖️</div>
            <p>{filter || klijentFilter ? "Nema rezultata pretrage." : "Još nema predmeta. Otvorite prvi predmet."}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Oznaka</th>
                <th>Tužitelj / Klijent</th>
                <th>Tuženi</th>
                <th>Klijent ureda</th>
                <th>Sud</th>
                <th>Otvoreno</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onSelect(p.id)}>
                  <td>
                    <span className="oznaka">{p.oznaka}</span>
                    <span className={`badge badge-${p.vrsta.toLowerCase()}`} style={{ marginLeft: 8 }}>{p.vrsta}</span>
                  </td>
                  <td>
                    <div>{p.tuzitelj.ime}</div>
                    {p.tuzitelj.oib && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>OIB: {p.tuzitelj.oib}</div>}
                  </td>
                  <td>
                    {p.tuzeni.ime ? (
                      <>
                        <div>{p.tuzeni.ime}</div>
                        {p.tuzeni.oib && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>OIB: {p.tuzeni.oib}</div>}
                      </>
                    ) : <span style={{ color: "var(--ink-3)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {p.klijent
                      ? <span style={{ color: "var(--primary)", fontWeight: 500 }}>{p.klijent.naziv}</span>
                      : <span style={{ color: "var(--ink-3)" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{p.sud || "—"}</td>
                  <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{formatDatum(p.datumOtvaranja)}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(p.id, e)}>Briši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <NovPredmetModal onSave={handleCreate} onClose={() => setModal(false)} />}
    </div>
  );
}

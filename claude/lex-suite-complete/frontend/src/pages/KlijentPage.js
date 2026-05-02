import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { getStrankeOrder } from "../utils/strankeUtils";
import KlijentModal from "../components/KlijentModal";
import NovPredmetModal from "../components/NovPredmetModal";

const TIP_LABEL = { fizicka: "Fizička osoba", pravna: "Pravna osoba" };

export default function KlijentPage({ klijentId, onBack, onSelectPredmet }) {
  const [klijent, setKlijent]   = useState(null);
  const [predmeti, setPredmeti] = useState([]);
  const [editModal, setEditModal]         = useState(false);
  const [novPredmetModal, setNovPredmetModal] = useState(false);

  const load = async () => {
    const [k, p] = await Promise.all([
      api.getKlijent(klijentId),
      api.getPredmetiByKlijent(klijentId),
    ]);
    setKlijent(k);
    setPredmeti(p);
  };

  useEffect(() => { load(); }, [klijentId]);

  const handleUpdate = async (data) => {
    await api.updateKlijent(klijentId, data);
    setKlijent(await api.getKlijent(klijentId));
  };

  const handleDelete = async () => {
    if (!window.confirm("Obrisati klijenta? Ova radnja je trajna.")) return;
    await api.deleteKlijent(klijentId);
    onBack();
  };

  const handleCreatePredmet = async (data) => {
    const p = await api.createPredmet(data);
    onSelectPredmet(p.id);
  };

  if (!klijent) return <div style={{ padding: 40, color: "var(--ink-3)", fontSize: 14 }}>Učitavam...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer",
              fontSize: 13, marginBottom: 10, padding: 0, display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ← Klijenti
          </button>
          <h2 style={{ marginBottom: 6 }}>{klijent.naziv}</h2>
          <span style={{ fontSize: 12, background: "var(--border)", borderRadius: 4, padding: "2px 8px" }}>
            {TIP_LABEL[klijent.tip] || klijent.tip}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setEditModal(true)}>✏ Uredi</button>
          <button className="btn btn-danger" onClick={handleDelete}>Obriši klijenta</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "flex-start" }}>

        {/* ── Osnovni podaci ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Osnovni podaci</span>
          </div>
          <div className="card-body">
            {[
              ["OIB",     klijent.oib,     true ],
              ["Email",   klijent.email,   false],
              ["Telefon", klijent.telefon, false],
              ["Adresa",  klijent.adresa,  false],
            ].map(([label, value, mono]) => value ? (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontFamily: mono ? "monospace" : undefined }}>{value}</div>
              </div>
            ) : null)}
            {klijent.biljeske && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 6 }}>
                  Bilješke
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>{klijent.biljeske}</p>
              </div>
            )}
            {!klijent.oib && !klijent.email && !klijent.telefon && !klijent.adresa && !klijent.biljeske && (
              <p style={{ color: "var(--ink-3)", fontSize: 13, margin: 0 }}>Nema dodatnih podataka.</p>
            )}
          </div>
        </div>

        {/* ── Predmeti klijenta ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Predmeti klijenta</span>
            <button className="btn btn-primary" onClick={() => setNovPredmetModal(true)}>+ Novi predmet</button>
          </div>
          {predmeti.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⚖️</div>
              <p>Klijent nema predmeta. Dodajte prvi.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Oznaka</th>
                  <th>Naziv predmeta</th>
                  <th>Stranke</th>
                  <th>Uloga</th>
                  <th>Sud</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {predmeti.map((p) => (
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
                            <div style={{ fontSize: 13 }}>{lijevo.ime}</div>
                            {desno.ime && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>c/a {desno.ime}</div>}
                          </>
                        );
                      })() : (
                        <div style={{ fontSize: 13 }}>{p.stranka?.ime}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.ulogaKlijenta || "—"}</td>
                    <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{p.sud || "—"}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editModal && (
        <KlijentModal
          initialData={klijent}
          onSave={handleUpdate}
          onClose={() => setEditModal(false)}
        />
      )}
      {novPredmetModal && (
        <NovPredmetModal
          initialData={{ klijent: { id: klijent.id, naziv: klijent.naziv, oib: klijent.oib } }}
          onSave={handleCreatePredmet}
          onClose={() => setNovPredmetModal(false)}
        />
      )}
    </div>
  );
}

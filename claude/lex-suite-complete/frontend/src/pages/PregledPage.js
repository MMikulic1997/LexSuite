import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import DatumBox from "../components/DatumBox";

const VRSTA_LABEL = { rociste: "Ročište", sastanak: "Sastanak", procesni: "Procesni rok", ostalo: "Ostalo" };
const PRIORITET_COLOR = { visoki: "var(--red)", srednji: "var(--amber)", niski: "var(--ink-3)" };

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "24px 28px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", lineHeight: 1, fontFamily: "var(--font-display)", letterSpacing: "-.5px" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, fontWeight: 500 }}>{label}</div>
      {sub != null && (
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function getDanLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("hr-HR", { weekday: "long" });
}

export default function PregledPage({ onSelectPredmet }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getPregled().then(setData);
  }, []);

  const danas = new Date();
  const dow = danas.getDay();
  const diffMon = dow === 0 ? -6 : 1 - dow;
  const pon = new Date(danas); pon.setDate(danas.getDate() + diffMon);
  const ned = new Date(pon);   ned.setDate(pon.getDate() + 6);
  const weekLabel = `${pon.toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit" })} – ${ned.toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Pregled</h2>
          <p>Sažetak stanja ureda</p>
        </div>
      </div>

      {/* ── Stat kartice ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Klijenata ukupno"  value={data?.brKlijenata} />
        <StatCard label="Predmeta ukupno"   value={data?.brPredmeta} />
        <StatCard label="Aktivnih predmeta" value={data?.brAktivnih} />
        <StatCard
          label="Rokova ovaj tjedan"
          value={data?.brRokovaTjedan}
          sub={weekLabel}
        />
      </div>

      {/* ── Ovaj tjedan ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Ovaj tjedan</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{weekLabel}</span>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {!data ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Učitavanje...</div>
          ) : data.tjedan.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-icon">🗓</div>
              <p>Nema rokova ni zadataka ovaj tjedan.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Datum</th>
                  <th style={{ width: 72 }}>Dan</th>
                  <th style={{ width: 90 }}>Vrsta</th>
                  <th>Naziv</th>
                  <th style={{ width: 140 }}>Predmet</th>
                </tr>
              </thead>
              <tbody>
                {data.tjedan.map((stavka, i) => {
                  const isRok     = stavka.tip === "rok";
                  const isZadatak = stavka.tip === "zadatak";
                  return (
                    <tr key={i}>
                      <td><DatumBox iso={stavka.datum} /></td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "capitalize" }}>
                        {getDanLabel(stavka.datum)}
                      </td>
                      <td>
                        {isRok && (
                          <span style={{
                            fontSize: 11, borderRadius: 4, padding: "2px 7px",
                            background: stavka.meta === "procesni" ? "var(--blue-pale)" : "var(--border)",
                            color:      stavka.meta === "procesni" ? "var(--blue)"      : "var(--ink-2)",
                          }}>
                            {VRSTA_LABEL[stavka.meta] || stavka.meta}
                          </span>
                        )}
                        {isZadatak && (
                          <span style={{
                            fontSize: 11, borderRadius: 4, padding: "2px 7px",
                            background: "var(--amber-pale)",
                            color: PRIORITET_COLOR[stavka.meta] || "var(--ink-2)",
                          }}>
                            Zadatak
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{stavka.naziv}</td>
                      <td>
                        <button
                          onClick={() => onSelectPredmet(stavka.predmetId)}
                          style={{
                            background: "none", border: "none", padding: 0,
                            cursor: "pointer", color: "var(--gold)", fontWeight: 500,
                            fontSize: 12, textDecoration: "underline", textUnderlineOffset: 2,
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {stavka.predmetOznaka}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

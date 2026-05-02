import React, { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { getStrankeOrder } from "../utils/strankeUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DatumBox from "../components/DatumBox";

// Build a predmet-like object from the flat rokovnik fields for getStrankeOrder
function rokPredmetView(p) {
  return {
    stranka:       { ime: p.strankaIme || "", uloga: p.strankaUloga || "Ostalo" },
    protustranka:  { ime: p.protustrankaIme || "" },
    stranaUmjesaca: p.stranaUmjesaca || "tuzitelj",
  };
}

// Makro-tipovi koji grupiraju vrstaRoka vrijednosti
const ROCISTE_VRSTE = ["rociste", "sastanak", "ostalo"];

const VRSTA_LABEL = {
  rociste:  "Ročište",
  sastanak: "Sastanak",
  ostalo:   "Ostalo",
  procesni: "Procesni rok",
};

// jsPDF built-in fonts podržavaju samo Latin-1 — prevodimo hrvatska slova.
function t(s) {
  return String(s ?? "")
    .replace(/[čć]/g, "c").replace(/[ČĆ]/g, "C")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/ž/g, "z").replace(/Ž/g, "Z")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

function periodFilter(rokovi, period) {
  const danas = new Date(); danas.setHours(0, 0, 0, 0);
  if (period === "svi") return rokovi;
  return rokovi.filter((r) => {
    const d = new Date(r.datum); d.setHours(0, 0, 0, 0);
    if (d < danas) return false;
    const diff = (d - danas) / (1000 * 60 * 60 * 24);
    if (period === "tjedan")    return diff <= 7;
    if (period === "dvaTjedna") return diff <= 14;
    if (period === "mjesec")
      return d.getMonth() === danas.getMonth() && d.getFullYear() === danas.getFullYear();
    return true;
  });
}

export default function RokovnikPage({ onSelectPredmet }) {
  const [svi, setSvi]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("svi");
  const [macroTip, setMacroTip] = useState("svi"); // "svi" | "rociste_sastanak" | "procesni"

  useEffect(() => {
    api.getRokovi().then((data) => { setSvi(data); setLoading(false); });
  }, []);

  const filtrirani = useMemo(() => {
    let r = periodFilter(svi, period);
    if (macroTip === "rociste_sastanak") r = r.filter((x) => ROCISTE_VRSTE.includes(x.vrstaRoka));
    if (macroTip === "procesni")         r = r.filter((x) => x.vrstaRoka === "procesni");
    return r;
  }, [svi, period, macroTip]);

  // ── PDF export ──────────────────────────────────────────────────────────────
  const generirajPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const datumSada = new Date().toLocaleString("hr-HR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const PERIOD_LABEL   = { svi: "Svi", tjedan: "Sljedeci tjedan", dvaTjedna: "Sljedeca dva tjedna", mjesec: "Ovaj mjesec" };
    const MACRO_LABEL    = { svi: "Svi rokovi", rociste_sastanak: "Rocista i sastanci", procesni: "Procesni rokovi" };

    const isProcesualni  = macroTip === "procesni";
    const isRocista      = macroTip === "rociste_sastanak";

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LexSuite - Rokovnik", 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generirano: ${datumSada}`, 14, 26);
    doc.text(
      `Period: ${PERIOD_LABEL[period] || period}  |  Vrsta: ${MACRO_LABEL[macroTip]}  |  Rokova: ${filtrirani.length}`,
      14, 32
    );
    doc.setTextColor(0);

    if (isProcesualni) {
      // Procesni rokovi — bez lokacije i vremena
      autoTable(doc, {
        startY: 38,
        head: [["Datum", "Predmet", "Naziv roka", "Napomena"]],
        body: filtrirani.map((r) => [
          new Date(r.datum).toLocaleDateString("hr-HR"),
          t(r.predmet.oznaka),
          t(r.naziv),
          t(r.napomena || "—"),
        ]),
        styles: { fontSize: 9, cellPadding: 3.5 },
        headStyles: { fillColor: [30, 25, 20], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 248, 244] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 30 },
          2: { cellWidth: 80 },
          3: { cellWidth: 100 },
        },
      });
    } else {
      // Ročišta/Sastanci ili miješano — s vremenom i lokacijom
      autoTable(doc, {
        startY: 38,
        head: [["Datum", "Vrijeme", "Predmet", "Stranke", "Naziv / Vrsta", "Lokacija / Dvorana", "Sudac"]],
        body: filtrirani.map((r) => {
          const isProc = r.vrstaRoka === "procesni";
          const { lijevo, desno } = getStrankeOrder(rokPredmetView(r.predmet));
          const stranke = desno.ime ? `${t(lijevo.ime)} c/a ${t(desno.ime)}` : t(lijevo.ime);
          const lokDvorana = isProc ? "—" : [t(r.lokacija || ""), t(r.dvorana || "")].filter(Boolean).join(" / ") || "—";
          return [
            new Date(r.datum).toLocaleDateString("hr-HR"),
            isProc ? "—" : (r.vrijeme || "—"),
            t(r.predmet.oznaka),
            stranke,
            `${t(r.naziv)} (${t(VRSTA_LABEL[r.vrstaRoka] || r.vrstaRoka)})`,
            lokDvorana,
            isProc ? "—" : t(r.sudacRoka || "—"),
          ];
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 25, 20], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 248, 244] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 16 },
          2: { cellWidth: 24 },
          3: { cellWidth: 52 },
          4: { cellWidth: 44 },
          5: { cellWidth: 44 },
          6: { cellWidth: 38 },
        },
      });
    }

    const suffix = macroTip === "procesni" ? "-procesni" : macroTip === "rociste_sastanak" ? "-rocista" : "";
    doc.save(`rokovnik${suffix}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Rokovnik</h2>
          <p>Svi rokovi iz svih predmeta</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {/* Period filter */}
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ fontSize: 13 }}>
              <option value="svi">Svi rokovi</option>
              <option value="tjedan">Sljedeći tjedan</option>
              <option value="dvaTjedna">Sljedeća dva tjedna</option>
              <option value="mjesec">Ovaj mjesec</option>
            </select>

            {/* Makro-tip filter */}
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { id: "svi",               label: "Svi" },
                { id: "rociste_sastanak",  label: "Ročišta / Sastanci" },
                { id: "procesni",          label: "Procesni rokovi" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setMacroTip(id)}
                  style={{
                    padding: "6px 12px", fontSize: 12.5, borderRadius: 6, border: "1px solid",
                    cursor: "pointer", fontFamily: "var(--font-body)", transition: "all .12s",
                    borderColor: macroTip === id ? "var(--gold)" : "var(--border)",
                    background:  macroTip === id ? "var(--gold-pale)" : "var(--surface)",
                    color:       macroTip === id ? "var(--gold)"      : "var(--ink-2)",
                    fontWeight:  macroTip === id ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={generirajPDF}
            disabled={filtrirani.length === 0}
          >
            ↓ Generiraj PDF
          </button>
        </div>

        {/* Broj rezultata */}
        {!loading && (
          <div style={{ padding: "8px 24px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--ink-3)", background: "var(--surface-2)" }}>
            {filtrirani.length} {filtrirani.length === 1 ? "rok" : "rokova"}
            {macroTip !== "svi" && (
              <span style={{ marginLeft: 6 }}>
                — {macroTip === "rociste_sastanak" ? "ročišta i sastanci" : "procesni rokovi"}
              </span>
            )}
          </div>
        )}

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Učitavanje...</div>
          ) : filtrirani.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-icon">📅</div>
              <p>Nema rokova za odabrane filtere.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>Datum</th>
                  {macroTip !== "procesni" && <th style={{ width: 64 }}>Vrijeme</th>}
                  <th>Predmet</th>
                  <th>Naziv</th>
                  <th>Vrsta</th>
                  {macroTip !== "procesni" && <th>Lokacija</th>}
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtrirani.map((r) => {
                  const isProc = r.vrstaRoka === "procesni";
                  return (
                    <tr key={r.id} style={{ opacity: r.dovrseno ? 0.45 : 1 }}>
                      <td><DatumBox iso={r.datum} /></td>

                      {macroTip !== "procesni" && (
                        <td style={{ fontSize: 13, color: (!isProc && r.vrijeme) ? "var(--ink)" : "var(--ink-4)" }}>
                          {isProc ? "—" : (r.vrijeme || "—")}
                        </td>
                      )}

                      <td>
                        <span className="oznaka" style={{ fontSize: 12 }}>{r.predmet.oznaka}</span>
                        {(() => {
                          const { lijevo, desno } = getStrankeOrder(rokPredmetView(r.predmet));
                          return (
                            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                              {lijevo.ime}{desno.ime ? ` c/a ${desno.ime}` : ""}
                            </div>
                          );
                        })()}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500 }}>{r.naziv}</div>
                        {r.napomena && (
                          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{r.napomena}</div>
                        )}
                      </td>

                      <td>
                        <span style={{
                          fontSize: 12, borderRadius: 4, padding: "2px 7px",
                          background: isProc ? "var(--blue-pale)" : "var(--border)",
                          color:      isProc ? "var(--blue)"      : "var(--ink-2)",
                        }}>
                          {VRSTA_LABEL[r.vrstaRoka] || r.vrstaRoka}
                        </span>
                      </td>

                      {macroTip !== "procesni" && (
                        <td style={{ fontSize: 13, color: (!isProc && r.lokacija) ? "var(--ink)" : "var(--ink-4)" }}>
                          {isProc ? "—" : (r.lokacija || "—")}
                        </td>
                      )}

                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => onSelectPredmet(r.predmet.id)}>
                          Otvori →
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

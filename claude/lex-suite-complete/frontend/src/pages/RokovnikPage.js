import React, { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const VRSTA_ROK_LABEL = {
  rociste:         "Ročište",
  sastanak:        "Sastanak",
  procesni:        "Procesni rok",
  administrativni: "Administrativni rok",
  ostalo:          "Ostalo",
};

// jsPDF built-in fonts (Helvetica/Times/Courier) podržavaju samo Latin-1.
// Hrvatska slova č,ć,š,ž,đ su izvan tog ranga – prevodimo ih za PDF output.
function t(s) {
  return String(s ?? "")
    .replace(/[čć]/g, "c").replace(/[ČĆ]/g, "C")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/ž/g, "z").replace(/Ž/g, "Z")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

const MJЕСЕCI = ["sij","velj","ozu","tra","svi","lip","srp","kol","ruj","lis","stu","pro"];

function DatumBox({ iso }) {
  const d = new Date(iso);
  const prosao = d < new Date();
  return (
    <div className={`rok-datum${prosao ? " rok-prosao" : ""}`} style={{ minWidth: 44 }}>
      <div className="dan">{d.getDate()}</div>
      <div className="mj">{MJЕСЕCI[d.getMonth()]} '{String(d.getFullYear()).slice(-2)}</div>
    </div>
  );
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
  const [vrsta, setVrsta]     = useState("svi");
  const [tip, setTip]         = useState("svi");

  useEffect(() => {
    api.getRokovi().then((data) => { setSvi(data); setLoading(false); });
  }, []);

  const filtrirani = useMemo(() => {
    let r = periodFilter(svi, period);
    if (vrsta !== "svi") r = r.filter((x) => x.vrstaRoka === vrsta);
    if (tip   !== "svi") r = r.filter((x) => x.tipPristupa === tip);
    return r;
  }, [svi, period, vrsta, tip]);

  const generirajPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    const datum = new Date().toLocaleString("hr-HR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const periodLabeli    = { svi: "Svi", tjedan: "Sljedeci tjedan", dvaTjedna: "Sljedeca dva tjedna", mjesec: "Ovaj mjesec" };
    const vrstaLabeli     = { svi: "Sve vrste", rociste: "Rociste", sastanak: "Sastanak", procesni: "Procesni rok", administrativni: "Administrativni rok", ostalo: "Ostalo" };
    const tipLabeli       = { svi: "Svi", opci: "Opci", interni: "Interni" };

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LexSuite - Rokovnik", 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generirano: ${datum}`, 14, 26);
    doc.text(
      `Period: ${periodLabeli[period] || period}  |  Vrsta: ${vrstaLabeli[vrsta] || vrsta}  |  Tip: ${tipLabeli[tip] || tip}  |  Rokova: ${filtrirani.length}`,
      14, 32
    );
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 38,
      head: [["Datum", "Vrijeme", "Predmet", "Stranke", "Naziv roka", "Lokacija", "Vrsta", "Tip"]],
      body: filtrirani.map((r) => [
        new Date(r.datum).toLocaleDateString("hr-HR"),
        r.vrijeme || "—",
        t(r.predmet.oznaka),
        t(`${r.predmet.tuziteljIme} vs. ${r.predmet.tuzeniIme}`),
        t(r.naziv),
        t(r.lokacija || "—"),
        t(VRSTA_ROK_LABEL[r.vrstaRoka] || r.vrstaRoka || "—"),
        r.tipPristupa === "interni" ? "Interni" : "Opci",
      ]),
      styles: { fontSize: 8.5, cellPadding: 3.5 },
      headStyles: { fillColor: [30, 25, 20], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 244] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 24 },
        3: { cellWidth: 60 },
        4: { cellWidth: 40 },
        5: { cellWidth: 45 },
        6: { cellWidth: 30 },
        7: { cellWidth: 18 },
      },
    });

    doc.save(`rokovnik-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Rokovnik</h2>
        <p>Svi rokovi iz svih predmeta</p>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ fontSize: 13 }}>
              <option value="svi">Svi rokovi</option>
              <option value="tjedan">Sljedeći tjedan</option>
              <option value="dvaTjedna">Sljedeća dva tjedna</option>
              <option value="mjesec">Ovaj mjesec</option>
            </select>
            <select value={vrsta} onChange={(e) => setVrsta(e.target.value)} style={{ fontSize: 13 }}>
              <option value="svi">Sve vrste</option>
              <option value="rociste">Ročište</option>
              <option value="sastanak">Sastanak</option>
              <option value="procesni">Procesni rok</option>
              <option value="administrativni">Administrativni rok</option>
              <option value="ostalo">Ostalo</option>
            </select>
            <select value={tip} onChange={(e) => setTip(e.target.value)} style={{ fontSize: 13 }}>
              <option value="svi">Interni + Opći</option>
              <option value="opci">Samo opći</option>
              <option value="interni">Samo interni</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generirajPDF} disabled={filtrirani.length === 0}>
            ↓ Generiraj PDF
          </button>
        </div>

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
                  <th style={{ width: 64 }}>Vrijeme</th>
                  <th>Predmet</th>
                  <th>Naziv roka</th>
                  <th>Lokacija</th>
                  <th>Vrsta</th>
                  <th>Tip</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtrirani.map((r) => (
                  <tr key={r.id} style={{ opacity: r.dovrseno ? 0.45 : 1 }}>
                    <td><DatumBox iso={r.datum} /></td>
                    <td style={{ fontSize: 13, color: r.vrijeme ? "var(--ink)" : "var(--ink-3)" }}>
                      {r.vrijeme || "—"}
                    </td>
                    <td>
                      <span className="oznaka" style={{ fontSize: 12 }}>{r.predmet.oznaka}</span>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                        {r.predmet.tuziteljIme} vs. {r.predmet.tuzeniIme}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.naziv}</div>
                      {r.napomena && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{r.napomena}</div>}
                    </td>
                    <td style={{ fontSize: 13, color: r.lokacija ? "var(--ink)" : "var(--ink-3)" }}>
                      {r.lokacija || "—"}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, background: "var(--cream)", borderRadius: 4, padding: "2px 7px" }}>
                        {VRSTA_ROK_LABEL[r.vrstaRoka] || "Ostalo"}
                      </span>
                    </td>
                    <td>
                      {r.tipPristupa === "interni"
                        ? <span style={{ fontSize: 12, background: "rgba(180,120,0,.15)", color: "var(--gold)", borderRadius: 4, padding: "2px 7px" }}>Interni</span>
                        : <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Opći</span>
                      }
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => onSelectPredmet(r.predmet.id)}>
                        Otvori →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

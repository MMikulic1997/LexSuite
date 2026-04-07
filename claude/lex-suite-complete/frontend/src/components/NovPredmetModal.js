import React, { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";

const GRUPE = [
  {
    naziv: "Sporni",
    vrste: [
      { kod: "PP",     naziv: "Parnica" },
      { kod: "KP",     naziv: "Kazneni" },
      { kod: "UP",     naziv: "Upravni spor" },
      { kod: "OS",     naziv: "Obiteljski spor" },
      { kod: "SP-OST", naziv: "Ostalo sporni" },
    ],
  },
  {
    naziv: "Nesporni",
    vrste: [
      { kod: "NS-OSN", naziv: "Osnivanje" },
      { kod: "NS-ZK",  naziv: "Zemljišnoknjižni upis" },
      { kod: "NS-OST", naziv: "Ostalo nesporni" },
    ],
  },
  {
    naziv: "Savjetodavni",
    vrste: [
      { kod: "SAV-UG",  naziv: "Izrada ugovora" },
      { kod: "SAV-MI",  naziv: "Pravno mišljenje" },
      { kod: "SAV-KON", naziv: "Konzultacije" },
      { kod: "SAV-OST", naziv: "Ostalo savjetodavni" },
    ],
  },
];

const SPORNI_VRSTE   = ["PP","KP","UP","OS","SP-OST"];
const NESPORNI_VRSTE = ["NS-OSN","NS-ZK","NS-OST"];
const getGrupa = (vrsta) => {
  if (SPORNI_VRSTE.includes(vrsta))   return "sporni";
  if (NESPORNI_VRSTE.includes(vrsta)) return "nesporni";
  return "savjetodavni";
};

const LBL = { // label style shorthand
  fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px",
  color: "var(--ink-3)", marginBottom: 2,
};

export default function NovPredmetModal({ onSave, onClose, initialData }) {
  // ── Klijent search ──────────────────────────────────────────────────────────
  const [klijenti, setKlijenti]             = useState([]);
  const [klijentSearch, setKlijentSearch]   = useState("");
  const [selectedKlijent, setSelectedKlijent] = useState(initialData?.klijent || null);
  const [showDropdown, setShowDropdown]     = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { api.getKlijenti().then(setKlijenti); }, []);

  const filteredKlijenti = klijentSearch.trim()
    ? klijenti
        .filter((k) =>
          k.naziv.toLowerCase().includes(klijentSearch.toLowerCase()) ||
          k.oib.includes(klijentSearch)
        )
        .slice(0, 6)
    : [];

  const handleSelectKlijent = (k) => {
    setSelectedKlijent(k);
    setKlijentSearch("");
    setShowDropdown(false);
    set("tuziteljIme", k.naziv);
    set("tuziteljOib", k.oib);
  };

  const handleClearKlijent = () => {
    setSelectedKlijent(null);
    setKlijentSearch("");
    set("tuziteljIme", "");
    set("tuziteljOib", "");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  // ── Case form ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    vrsta:        "KP",
    tuziteljIme:  initialData?.klijent?.naziv || "",
    tuziteljOib:  initialData?.klijent?.oib  || "",
    tuzeniIme:    "",
    tuzeniOib:    "",
    poslovniBroj: "",
    vps:          "",
    sud:          "",
    sudac:        "",
    opis:         "",
  });
  const [rucnaOznaka, setRucnaOznaka] = useState(false);
  const [oznaka, setOznaka]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const set  = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const grupa = getGrupa(form.vrsta);
  const isSporni      = grupa === "sporni";
  const isNesporni    = grupa === "nesporni";
  const isSavjetodavni = grupa === "savjetodavni";

  const submit = async () => {
    if (isSporni && (!form.tuziteljIme.trim() || !form.tuzeniIme.trim())) {
      setError("Tužitelj i tuženi su obavezni."); return;
    }
    if (!isSporni && !form.tuziteljIme.trim()) {
      setError("Klijent je obavezan."); return;
    }
    if (rucnaOznaka && !oznaka.trim()) {
      setError("Unesite oznaku predmeta."); return;
    }
    setLoading(true); setError("");
    try {
      await onSave({
        vrsta: form.vrsta,
        ...(rucnaOznaka && { oznaka: oznaka.trim() }),
        tuzitelj:     { ime: form.tuziteljIme.trim(), oib: form.tuziteljOib.trim() },
        tuzeni:       { ime: form.tuzeniIme.trim(),   oib: form.tuzeniOib.trim()   },
        ...(isSporni && { poslovniBroj: form.poslovniBroj, vps: form.vps, sud: form.sud, sudac: form.sudac }),
        ...(isNesporni && { sud: form.sud }),
        opis:    form.opis,
        ...(selectedKlijent && { klijentId: selectedKlijent.id }),
      });
      onClose();
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  // ── Klijent search UI (shared for all types) ─────────────────────────────
  const klijentSearchUI = (
    <div className="form-group full">
      <label>{isSporni ? "Klijent ureda (za vezanje evidencije)" : "Klijent *"}</label>
      {selectedKlijent ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", background: "var(--parchment)",
          border: "1px solid var(--cream)", borderRadius: 6,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>👤 {selectedKlijent.naziv}</span>
          {selectedKlijent.oib && (
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "monospace" }}>{selectedKlijent.oib}</span>
          )}
          <button
            onClick={handleClearKlijent}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--ink-3)", lineHeight: 1, padding: "0 2px" }}
            title="Ukloni klijenta"
          >×</button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            ref={searchRef}
            placeholder="Pretraži po imenu ili OIB-u..."
            value={klijentSearch}
            onChange={(e) => { setKlijentSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => klijentSearch && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown && filteredKlijenti.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "#fff", border: "1px solid var(--cream)", borderRadius: 6,
              boxShadow: "0 4px 16px rgba(0,0,0,.1)", overflow: "hidden", marginTop: 2,
            }}>
              {filteredKlijenti.map((k) => (
                <div
                  key={k.id}
                  onMouseDown={() => handleSelectKlijent(k)}
                  style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--parchment)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <span style={{ fontWeight: 500, flex: 1 }}>{k.naziv}</span>
                  {k.oib && <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "monospace" }}>{k.oib}</span>}
                  <span style={{ fontSize: 11, background: "var(--cream)", borderRadius: 3, padding: "1px 6px", color: "var(--ink-3)" }}>
                    {k.tip === "pravna" ? "Pravna" : "Fizička"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Novi predmet</span>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>}
          <div className="form-grid">

            {/* ── Vrsta + Oznaka ─────────────────────────────────────────── */}
            <div className="form-group">
              <label>Vrsta predmeta</label>
              <select value={form.vrsta} onChange={(e) => set("vrsta", e.target.value)}>
                {GRUPE.map((g) => (
                  <optgroup key={g.naziv} label={g.naziv}>
                    {g.vrste.map((v) => (
                      <option key={v.kod} value={v.kod}>{v.kod} – {v.naziv}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Oznaka
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 400, fontSize: 12, color: "var(--ink-3)" }}>
                  <input
                    type="checkbox"
                    checked={rucnaOznaka}
                    onChange={(e) => { setRucnaOznaka(e.target.checked); setOznaka(""); }}
                    style={{ width: "auto", margin: 0, cursor: "pointer" }}
                  />
                  Unesi ručno
                </span>
              </label>
              {rucnaOznaka
                ? <input placeholder={`npr. ${form.vrsta}0023/22`} value={oznaka} onChange={(e) => setOznaka(e.target.value)} autoFocus />
                : <input value={`${form.vrsta}XXXX/${String(new Date().getFullYear()).slice(-2)}`} disabled style={{ opacity: .5 }} />
              }
            </div>

            {/* ════════════════ SPORNI ════════════════ */}
            {isSporni && (
              <>
                {klijentSearchUI}

                <div className="form-group">
                  <label>Tužitelj – ime i prezime / naziv *</label>
                  <input placeholder="Ime i prezime ili naziv tvrtke" value={form.tuziteljIme} onChange={(e) => set("tuziteljIme", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tužitelj – OIB</label>
                  <input placeholder="11 znamenki" maxLength={11} value={form.tuziteljOib} onChange={(e) => set("tuziteljOib", e.target.value.replace(/\D/g, ""))} />
                </div>

                <div className="form-group">
                  <label>Tuženi – ime i prezime / naziv *</label>
                  <input placeholder="Ime i prezime ili naziv tvrtke" value={form.tuzeniIme} onChange={(e) => set("tuzeniIme", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tuženi – OIB</label>
                  <input placeholder="11 znamenki" maxLength={11} value={form.tuzeniOib} onChange={(e) => set("tuzeniOib", e.target.value.replace(/\D/g, ""))} />
                </div>

                <div className="form-group">
                  <label>Sud</label>
                  <input placeholder="npr. Općinski sud Zagreb" value={form.sud} onChange={(e) => set("sud", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sudac</label>
                  <input placeholder="Ime i prezime suca" value={form.sudac} onChange={(e) => set("sudac", e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Poslovni broj suda</label>
                  <input placeholder="npr. P-123/2025" value={form.poslovniBroj} onChange={(e) => set("poslovniBroj", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>VPS – Vrijednost predmeta spora</label>
                  <input placeholder="npr. 50.000,00 EUR (opcionalno)" value={form.vps} onChange={(e) => set("vps", e.target.value)} />
                </div>
              </>
            )}

            {/* ════════════════ NESPORNI ════════════════ */}
            {isNesporni && (
              <>
                {klijentSearchUI}

                <div className="form-group">
                  <label>Klijent – ime i prezime / naziv *</label>
                  <input placeholder="Ime i prezime ili naziv tvrtke" value={form.tuziteljIme} onChange={(e) => set("tuziteljIme", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Klijent – OIB</label>
                  <input placeholder="11 znamenki" maxLength={11} value={form.tuziteljOib} onChange={(e) => set("tuziteljOib", e.target.value.replace(/\D/g, ""))} />
                </div>

                <div className="form-group full">
                  <label>Sud (opcionalno)</label>
                  <input placeholder="npr. Trgovački sud Zagreb" value={form.sud} onChange={(e) => set("sud", e.target.value)} />
                </div>
              </>
            )}

            {/* ════════════════ SAVJETODAVNI ════════════════ */}
            {isSavjetodavni && (
              <>
                {klijentSearchUI}

                <div className="form-group">
                  <label>Klijent – ime i prezime / naziv *</label>
                  <input placeholder="Ime i prezime ili naziv tvrtke" value={form.tuziteljIme} onChange={(e) => set("tuziteljIme", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Klijent – OIB</label>
                  <input placeholder="11 znamenki" maxLength={11} value={form.tuziteljOib} onChange={(e) => set("tuziteljOib", e.target.value.replace(/\D/g, ""))} />
                </div>
              </>
            )}

            {/* ── Opis (sve vrste) ─────────────────────────────────────── */}
            <div className="form-group full">
              <label>Kratak opis predmeta</label>
              <textarea placeholder="Ukratko opisite predmet..." value={form.opis} onChange={(e) => set("opis", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Odustani</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Spremam..." : "Otvori predmet"}
          </button>
        </div>
      </div>
    </div>
  );
}

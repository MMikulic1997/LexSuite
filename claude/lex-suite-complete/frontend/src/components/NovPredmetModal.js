import React, { useState } from "react";
import { api } from "../utils/api";

const ULOGE_SPORNI   = ["Tužitelj", "Tuženik", "Umješač", "Ovršenik", "Ovrhovoditelj", "Ostalo"];
const ULOGE_NESPORNI = ["Naručitelj", "Zastupani", "Ostalo"];

export default function NovPredmetModal({ onSave, onClose, initialData }) {
  const klijentLocked = !!initialData?.klijent;

  const [form, setForm] = useState({
    vrsta:            "SPORNI",
    nazivPredmeta:    "",
    oznakaPrefix:     "",
    rucnaOznaka:      false,
    oznaka:           "",
    // stranka (oba tipa)
    strankaIme:       initialData?.klijent?.naziv || "",
    strankaOib:       initialData?.klijent?.oib   || "",
    strankaUloga:     "Tužitelj",   // SPORNI: uloga iz ULOGE_SPORNI
    ulogaKlijenta:    "Naručitelj", // NESPORNI: uloga iz ULOGE_NESPORNI
    stranaUmjesaca:   "tuzitelj",   // vidljivo samo kad je strankaUloga = "Umješač"
    // protustranka (samo SPORNI, neobavezno)
    protustrankaIme:  "",
    protustrankaOib:  "",
    // sud, sudac, pbs, vps (samo SPORNI)
    sud:              "",
    sudac:            "",
    poslovniBroj:     "",
    vps:              "",
    // opis
    opis:             "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isSporni = form.vrsta === "SPORNI";

  const godina = String(new Date().getFullYear()).slice(-2);
  const previewOznaka = form.rucnaOznaka
    ? (form.oznaka || "…")
    : `${form.oznakaPrefix || ""}XXXX/${godina}`;

  const submit = async () => {
    if (!form.nazivPredmeta.trim())              { setError("Naziv predmeta je obavezan."); return; }
    if (!form.strankaIme.trim())                 { setError(isSporni ? "Ime stranke je obavezno." : "Ime klijenta je obavezno."); return; }
    if (form.rucnaOznaka && !form.oznaka.trim()) { setError("Unesite oznaku predmeta."); return; }
    setLoading(true); setError("");
    try {
      await onSave({
        vrsta:         form.vrsta,
        nazivPredmeta: form.nazivPredmeta.trim(),
        ...(form.rucnaOznaka
          ? { oznaka: form.oznaka.trim() }
          : { oznakaPrefix: form.oznakaPrefix.trim() }),
        stranka:      { ime: form.strankaIme.trim(), oib: form.strankaOib.trim(), uloga: isSporni ? form.strankaUloga : undefined },
        protustranka: isSporni ? { ime: form.protustrankaIme.trim(), oib: form.protustrankaOib.trim() } : undefined,
        ulogaKlijenta:  isSporni ? form.strankaUloga : form.ulogaKlijenta,
        stranaUmjesaca: isSporni && form.strankaUloga === "Umješač" ? form.stranaUmjesaca : undefined,
        poslovniBroj:  form.poslovniBroj,
        ...(isSporni && { sud: form.sud, sudac: form.sudac, vps: form.vps }),
        opis:          form.opis,
        ...(initialData?.klijent && { klijentId: initialData.klijent.id }),
      });
      onClose();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

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

            {/* ── Vrsta ── */}
            <div className="form-group">
              <label>Vrsta predmeta</label>
              <select value={form.vrsta} onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, vrsta: v, strankaUloga: "Tužitelj", ulogaKlijenta: "Naručitelj" }));
              }}>
                <option value="SPORNI">Sporni</option>
                <option value="NESPORNI">Nesporni</option>
              </select>
            </div>

            {/* ── Naziv predmeta ── */}
            <div className="form-group">
              <label>Naziv predmeta *</label>
              <input
                placeholder={isSporni ? "npr. Ovrha, Kazneni postupak, Razvod..." : "npr. Osnivanje d.o.o., Ugovor o najmu..."}
                value={form.nazivPredmeta}
                onChange={(e) => set("nazivPredmeta", e.target.value)}
                autoFocus
              />
            </div>

            {/* ── Oznaka ── */}
            <div className="form-group full">
              <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>Oznaka predmeta</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 400, fontSize: 12, color: "var(--ink-3)" }}>
                  <input
                    type="checkbox"
                    checked={form.rucnaOznaka}
                    onChange={(e) => set("rucnaOznaka", e.target.checked)}
                    style={{ width: "auto", margin: 0, cursor: "pointer" }}
                  />
                  Unesi ručno
                </span>
              </label>
              {form.rucnaOznaka ? (
                <input
                  placeholder={`npr. KP0023/${godina}`}
                  value={form.oznaka}
                  onChange={(e) => set("oznaka", e.target.value)}
                />
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ width: 100 }}
                    placeholder="Prefix (npr. KP)"
                    maxLength={8}
                    value={form.oznakaPrefix}
                    onChange={(e) => set("oznakaPrefix", e.target.value.toUpperCase())}
                  />
                  <span style={{ fontSize: 13, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    → <span style={{ fontFamily: "monospace", color: "var(--ink-2)", fontWeight: 500 }}>{previewOznaka}</span>
                  </span>
                </div>
              )}
            </div>

            {/* ── Klijent ureda (zaključan ako dolazi s KlijentPage) ── */}
            {initialData?.klijent && (
              <div className="form-group full">
                <label>Klijent ureda</label>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", background: "var(--surface-3)",
                  border: "1px solid var(--border)", borderRadius: 6,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>👤 {initialData.klijent.naziv}</span>
                  {initialData.klijent.oib && (
                    <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "monospace" }}>{initialData.klijent.oib}</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--ink-3)", padding: "2px 7px", background: "var(--border)", borderRadius: 4 }}>zaključano</span>
                </div>
              </div>
            )}

            {isSporni ? (
              <>
                {/* ── Stranka (SPORNI) ── */}
                {!klijentLocked && (
                  <>
                    <div className="form-group">
                      <label>Stranka – ime i prezime / naziv *</label>
                      <input
                        placeholder="Ime i prezime ili naziv tvrtke"
                        value={form.strankaIme}
                        onChange={(e) => set("strankaIme", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Stranka – OIB</label>
                      <input
                        placeholder="11 znamenki" maxLength={11}
                        value={form.strankaOib}
                        onChange={(e) => set("strankaOib", e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </>
                )}
                <div className="form-group full">
                  <label>Uloga stranke u predmetu *</label>
                  <select value={form.strankaUloga} onChange={(e) => set("strankaUloga", e.target.value)}>
                    {ULOGE_SPORNI.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {form.strankaUloga === "Umješač" && (
                  <div className="form-group full">
                    <label>Strana umješača</label>
                    <select value={form.stranaUmjesaca} onChange={(e) => set("stranaUmjesaca", e.target.value)}>
                      <option value="tuzitelj">Na strani tužitelja</option>
                      <option value="tuzenik">Na strani tuženika</option>
                    </select>
                  </div>
                )}

                {/* ── Protustranka (SPORNI, neobavezno) ── */}
                <div className="form-group">
                  <label>Protustranka – ime i prezime / naziv</label>
                  <input
                    placeholder="Ime i prezime ili naziv tvrtke (opcionalno)"
                    value={form.protustrankaIme}
                    onChange={(e) => set("protustrankaIme", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Protustranka – OIB</label>
                  <input
                    placeholder="11 znamenki" maxLength={11}
                    value={form.protustrankaOib}
                    onChange={(e) => set("protustrankaOib", e.target.value.replace(/\D/g, ""))}
                  />
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
                  <label>VPS – Vrijednost predmeta spora</label>
                  <input placeholder="npr. 50.000,00 EUR (opcionalno)" value={form.vps} onChange={(e) => set("vps", e.target.value)} />
                </div>
              </>
            ) : (
              <>
                {/* ── Klijent (NESPORNI) ── */}
                <div className="form-group">
                  <label>Klijent – ime i prezime / naziv *</label>
                  <input
                    placeholder="Ime i prezime ili naziv tvrtke"
                    value={form.strankaIme}
                    onChange={(e) => set("strankaIme", e.target.value)}
                    readOnly={klijentLocked}
                    style={klijentLocked ? { opacity: .6 } : undefined}
                  />
                </div>
                <div className="form-group">
                  <label>Klijent – OIB</label>
                  <input
                    placeholder="11 znamenki" maxLength={11}
                    value={form.strankaOib}
                    onChange={(e) => set("strankaOib", e.target.value.replace(/\D/g, ""))}
                    readOnly={klijentLocked}
                    style={klijentLocked ? { opacity: .6 } : undefined}
                  />
                </div>
                <div className="form-group full">
                  <label>Uloga klijenta u predmetu *</label>
                  <select value={form.ulogaKlijenta} onChange={(e) => set("ulogaKlijenta", e.target.value)}>
                    {ULOGE_NESPORNI.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* ── Poslovni broj (oba tipa) ── */}
            <div className="form-group">
              <label>{isSporni ? "Poslovni broj suda" : "Poslovni broj / referenca"}</label>
              <input
                placeholder={isSporni ? "npr. P-123/2025" : "npr. Ugovor-2025-001 (opcionalno)"}
                value={form.poslovniBroj}
                onChange={(e) => set("poslovniBroj", e.target.value)}
              />
            </div>

            {/* ── Opis ── */}
            <div className="form-group full">
              <label>Kratak opis predmeta</label>
              <textarea placeholder="Ukratko opišite predmet..." value={form.opis} onChange={(e) => set("opis", e.target.value)} />
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

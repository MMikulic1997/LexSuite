import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const MJЕСЕCI = ["sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"];

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString("hr-HR");
}

function DatumBox({ iso }) {
  const d = new Date(iso);
  const danas = new Date();
  const prosao = d < danas;
  return (
    <div className={`rok-datum${prosao ? " rok-prosao" : ""}`}>
      <div className="dan">{d.getDate()}</div>
      <div className="mj">{MJЕСЕCI[d.getMonth()]} '{String(d.getFullYear()).slice(-2)}</div>
    </div>
  );
}

// ── Naslovnica ──────────────────────────────────────────────────────────────────
const SPORNI_VRSTE   = ["PP","KP","UP","OS","SP-OST"];
const NESPORNI_VRSTE = ["NS-OSN","NS-ZK","NS-OST"];

function Naslovnica({ predmet, onUpdate, onSelectKlijent }) {
  const isSporni      = SPORNI_VRSTE.includes(predmet.vrsta);
  const isNesporni    = NESPORNI_VRSTE.includes(predmet.vrsta);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    poslovniBroj: predmet.poslovniBroj,
    vps:          predmet.vps || "",
    sud:          predmet.sud,
    sudac:        predmet.sudac,
    opis:         predmet.opis,
    status:       predmet.status,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    await onUpdate(form);
    setEditMode(false);
  };

  return (
    <div className="card">
        <div className="card-header">
          <span className="card-title">Osnovne informacije</span>
          {!editMode
            ? <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>✏ Uredi</button>
            : <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Odustani</button>
                <button className="btn btn-gold btn-sm" onClick={save}>Spremi</button>
              </div>
          }
        </div>
        <div className="card-body">
          {editMode ? (
            <div className="form-grid">
              {isSporni && (
                <>
                  <div className="form-group">
                    <label>Sud</label>
                    <input value={form.sud} onChange={(e) => set("sud", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Sudac</label>
                    <input value={form.sudac} onChange={(e) => set("sudac", e.target.value)} />
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
              {isNesporni && (
                <div className="form-group full">
                  <label>Sud</label>
                  <input placeholder="npr. Trgovački sud Zagreb (opcionalno)" value={form.sud} onChange={(e) => set("sud", e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="aktivan">Aktivan</option>
                  <option value="zatvoren">Zatvoren</option>
                  <option value="mirovanje">Mirovanje</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Opis predmeta</label>
                <textarea value={form.opis} onChange={(e) => set("opis", e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: predmet.opis ? 20 : 0 }}>
                {/* Tužitelj / Klijent — uvijek vidljivo */}
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>
                    {isSporni ? "Tužitelj" : "Klijent"}
                  </div>
                  <div style={{ fontWeight: 500 }}>{predmet.tuzitelj.ime}</div>
                  {predmet.tuzitelj.oib && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>OIB: {predmet.tuzitelj.oib}</div>}
                </div>
                {/* Tuženi — samo za sporni */}
                {isSporni && predmet.tuzeni.ime && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>Tuženi</div>
                    <div style={{ fontWeight: 500 }}>{predmet.tuzeni.ime}</div>
                    {predmet.tuzeni.oib && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>OIB: {predmet.tuzeni.oib}</div>}
                  </div>
                )}
                {/* Sud — sporni i nesporni, samo ako postoji */}
                {(isSporni || isNesporni) && predmet.sud && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>Sud</div>
                    <div>{predmet.sud}</div>
                  </div>
                )}
                {/* Sudac — samo sporni */}
                {isSporni && predmet.sudac && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>Sudac</div>
                    <div>{predmet.sudac}</div>
                  </div>
                )}
                {/* Poslovni broj — samo sporni */}
                {isSporni && predmet.poslovniBroj && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>Poslovni broj suda</div>
                    <div style={{ fontWeight: 500 }}>{predmet.poslovniBroj}</div>
                  </div>
                )}
                {/* VPS — samo sporni */}
                {isSporni && predmet.vps && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>VPS</div>
                    <div style={{ fontWeight: 500 }}>{predmet.vps}</div>
                  </div>
                )}
                {/* Kartica klijenta — ako je vezana */}
                {predmet.klijent && (
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>
                      {isSporni ? "Klijent ureda" : "Kartica klijenta"}
                    </div>
                    <button
                      onClick={() => onSelectKlijent?.(predmet.klijent.id)}
                      style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                    >
                      {predmet.klijent.naziv}
                    </button>
                  </div>
                )}
              </div>
              {predmet.opis && (
                <div style={{ borderTop: "1px solid var(--cream)", paddingTop: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 6 }}>Opis</div>
                  <p style={{ lineHeight: 1.7, color: "var(--ink-2)" }}>{predmet.opis}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
}

// ── Rokovnik ────────────────────────────────────────────────────────────────────
const VRSTA_ROK_LABEL = {
  rociste:       "Ročište",
  sastanak:      "Sastanak",
  procesni:      "Procesni rok",
  administrativni: "Administrativni rok",
  ostalo:        "Ostalo",
};
function Rokovnik({ predmet, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ naziv: "", datum: "", vrijeme: "", lokacija: "", napomena: "", tipPristupa: "opci", vrstaRoka: "ostalo" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.naziv || !form.datum) return;
    await api.createRok(predmet.id, form);
    setForm({ naziv: "", datum: "", vrijeme: "", lokacija: "", napomena: "", tipPristupa: "opci", vrstaRoka: "ostalo" });
    setModal(false);
    onRefresh();
  };

  const toggle = async (rok) => {
    await api.updateRok(predmet.id, rok.id, { dovrseno: !rok.dovrseno });
    onRefresh();
  };

  const del = async (rokId) => {
    if (!window.confirm("Brisanje roka?")) return;
    await api.deleteRok(predmet.id, rokId);
    onRefresh();
  };

  const sorted = [...predmet.rokovi].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const nadolazeci = sorted.filter((r) => !r.dovrseno && new Date(r.datum) >= new Date());
  const ostali = sorted.filter((r) => r.dovrseno || new Date(r.datum) < new Date());

  const RokRow = ({ rok }) => (
    <div className={`rok-item${rok.dovrseno ? " rok-dovrseno" : ""}`}>
      <DatumBox iso={rok.datum} />
      <div className="rok-info">
        <div className="rok-naziv">
          {rok.naziv}
          {rok.vrstaRoka && rok.vrstaRoka !== "ostalo" && (
            <span style={{ marginLeft: 8, fontSize: 11, background: "var(--cream)", color: "var(--ink-2)", borderRadius: 4, padding: "2px 6px" }}>
              {VRSTA_ROK_LABEL[rok.vrstaRoka] || rok.vrstaRoka}
            </span>
          )}
          {rok.tipPristupa === "interni" && (
            <span style={{ marginLeft: 6, fontSize: 11, background: "rgba(180,120,0,.15)", color: "var(--gold)", borderRadius: 4, padding: "2px 6px" }}>interni</span>
          )}
        </div>
        {(rok.vrijeme || rok.lokacija) && (
          <div className="rok-napomena">
            {rok.vrijeme && <span>🕐 {rok.vrijeme}</span>}
            {rok.vrijeme && rok.lokacija && <span style={{ margin: "0 6px", opacity: .4 }}>·</span>}
            {rok.lokacija && <span>📍 {rok.lokacija}</span>}
          </div>
        )}
        {rok.napomena && <div className="rok-napomena">{rok.napomena}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => toggle(rok)} title={rok.dovrseno ? "Označi nedovršenim" : "Označi dovršenim"}>
          {rok.dovrseno ? "↩" : "✓"}
        </button>
        <button className="btn btn-sm btn-danger" onClick={() => del(rok.id)}>×</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Rokovnik</span>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Dodaj rok</button>
        </div>
        <div className="card-body">
          {predmet.rokovi.length === 0 ? (
            <div className="empty"><div className="empty-icon">📅</div><p>Nema unesenih rokova.</p></div>
          ) : (
            <>
              {nadolazeci.length > 0 && (
                <>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-3)", marginBottom: 8, fontWeight: 500 }}>Nadolazeći</div>
                  {nadolazeci.map((r) => <RokRow key={r.id} rok={r} />)}
                </>
              )}
              {ostali.length > 0 && (
                <div style={{ marginTop: nadolazeci.length ? 20 : 0 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-3)", marginBottom: 8, fontWeight: 500 }}>Prošli / Dovršeni</div>
                  {ostali.map((r) => <RokRow key={r.id} rok={r} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Novi rok</span>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Naziv roka *</label>
                  <input placeholder="npr. Ročište, Dostava podnesaka..." value={form.naziv} onChange={(e) => set("naziv", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Datum *</label>
                  <input type="date" value={form.datum} onChange={(e) => set("datum", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vrijeme</label>
                  <input type="time" value={form.vrijeme} onChange={(e) => set("vrijeme", e.target.value)} placeholder="npr. 10:30" />
                </div>
                <div className="form-group full">
                  <label>Lokacija</label>
                  <input placeholder="npr. Općinski sud Zagreb, sala 5" value={form.lokacija} onChange={(e) => set("lokacija", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vrsta roka</label>
                  <select value={form.vrstaRoka} onChange={(e) => set("vrstaRoka", e.target.value)}>
                    <option value="rociste">Ročište</option>
                    <option value="sastanak">Sastanak</option>
                    <option value="procesni">Procesni rok</option>
                    <option value="administrativni">Administrativni rok</option>
                    <option value="ostalo">Ostalo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tip pristupa</label>
                  <select value={form.tipPristupa} onChange={(e) => set("tipPristupa", e.target.value)}>
                    <option value="opci">Opći</option>
                    <option value="interni">Interni</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label>Napomena</label>
                  <textarea placeholder="Dodatne informacije o roku..." value={form.napomena} onChange={(e) => set("napomena", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Odustani</button>
              <button className="btn btn-primary" onClick={add}>Dodaj rok</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dokumenti ───────────────────────────────────────────────────────────────────
const DOK_IKONE = { tuzba: "📄", odgovor: "📋", presuda: "⚖️", rjesenje: "📑", nalaz: "🔍", ostalo: "📁" };

function formatVelicina(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Dokumenti({ predmet, onRefresh }) {
  const [modal, setModal]         = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm]           = useState({ naziv: "", vrsta: "ostalo", opis: "" });
  const [fajl, setFajl]           = useState(null);
  const [uploadForm, setUploadForm] = useState({ naziv: "", vrsta: "ostalo", opis: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setUF = (k, v) => setUploadForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.naziv) return;
    await api.createDokument(predmet.id, form);
    setForm({ naziv: "", vrsta: "ostalo", opis: "" });
    setModal(false);
    onRefresh();
  };

  const handleUpload = async () => {
    if (!fajl) return;
    setUploading(true);
    setUploadError("");
    try {
      await api.uploadDokument(predmet.id, fajl, uploadForm);
      setFajl(null);
      setUploadForm({ naziv: "", vrsta: "ostalo", opis: "" });
      setUploadModal(false);
      onRefresh();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchBlob = async (dokId) => {
    const res = await fetch(api.getFajlUrl(predmet.id, dokId));
    if (!res.ok) throw new Error("Fajl nije dostupan");
    return { blob: await res.blob(), type: res.headers.get("Content-Type") || "" };
  };

  const prikaziFajl = async (d) => {
    const { blob } = await fetchBlob(d.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const downloadFajl = async (d) => {
    const { blob } = await fetchBlob(d.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.naziv;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const del = async (dokId) => {
    if (!window.confirm("Brisanje dokumenta?")) return;
    await api.deleteDokument(predmet.id, dokId);
    onRefresh();
  };

  const DokVrstaSelect = ({ value, onChange }) => (
    <select value={value} onChange={onChange}>
      <option value="tuzba">Tužba</option>
      <option value="odgovor">Odgovor na tužbu</option>
      <option value="presuda">Presuda</option>
      <option value="rjesenje">Rješenje</option>
      <option value="nalaz">Vještački nalaz</option>
      <option value="ostalo">Ostalo</option>
    </select>
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Dokumenti</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(true)}>+ Bilješka</button>
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>↑ Upload fajla</button>
          </div>
        </div>
        <div className="card-body">
          {predmet.dokumenti.length === 0 ? (
            <div className="empty"><div className="empty-icon">📂</div><p>Nema dodanih dokumenata.</p></div>
          ) : (
            predmet.dokumenti.map((d) => (
              <div key={d.id} className="dok-item">
                <div className="dok-icon">{DOK_IKONE[d.vrsta] || "📁"}</div>
                <div className="dok-info">
                  <div className="dok-naziv">{d.naziv}</div>
                  <div className="dok-meta">
                    {d.vrsta} · {formatDatum(d.datumDodavanja)}
                    {d.velicina ? ` · ${formatVelicina(d.velicina)}` : ""}
                    {d.opis ? ` · ${d.opis}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {d.putanja && <>
                    <button className="btn btn-sm btn-ghost" onClick={() => prikaziFajl(d)} title="Otvori u novom tabu">Prikaži</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => downloadFajl(d)} title="Preuzmi fajl">Download</button>
                  </>}
                  <button className="btn btn-sm btn-danger" onClick={() => del(d.id)}>Obriši</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: bilješka bez fajla */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova bilješka dokumenta</span>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Naziv *</label>
                  <input placeholder="npr. Tužba od 15.03.2025." value={form.naziv} onChange={(e) => setF("naziv", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vrsta</label>
                  <DokVrstaSelect value={form.vrsta} onChange={(e) => setF("vrsta", e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Opis / bilješka</label>
                  <textarea placeholder="Kratak opis dokumenta..." value={form.opis} onChange={(e) => setF("opis", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Odustani</button>
              <button className="btn btn-primary" onClick={add}>Dodaj</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: upload fajla */}
      {uploadModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setUploadModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Upload dokumenta</span>
              <button className="btn-close" onClick={() => setUploadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {uploadError && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {uploadError}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label>Fajl * (PDF, Word, slike – max 50 MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      setFajl(f || null);
                      if (f && !uploadForm.naziv) setUF("naziv", f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                </div>
                <div className="form-group full">
                  <label>Naziv dokumenta</label>
                  <input
                    placeholder="Ostavite prazno za naziv fajla"
                    value={uploadForm.naziv}
                    onChange={(e) => setUF("naziv", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Vrsta</label>
                  <DokVrstaSelect value={uploadForm.vrsta} onChange={(e) => setUF("vrsta", e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Opis / bilješka</label>
                  <textarea placeholder="Kratak opis..." value={uploadForm.opis} onChange={(e) => setUF("opis", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUploadModal(false)}>Odustani</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!fajl || uploading}>
                {uploading ? "Uploading..." : "Spremi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tijek ───────────────────────────────────────────────────────────────────────
function Tijek({ predmet, onRefresh }) {
  const [form, setForm] = useState({ datum: "", tekst: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.datum || !form.tekst.trim()) return;
    setLoading(true);
    await api.createTijek(predmet.id, form);
    setForm({ datum: "", tekst: "" });
    setLoading(false);
    onRefresh();
  };

  const del = async (unosId) => {
    if (!window.confirm("Obrisati ovaj unos?")) return;
    await api.deleteTijek(predmet.id, unosId);
    onRefresh();
  };

  const sorted = [...(predmet.tijek || [])].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Tijek predmeta</span>
      </div>
      <div className="card-body">
        {/* Unos novog događaja */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, alignItems: "flex-start", background: "var(--parchment)", padding: 16, borderRadius: 6 }}>
          <input
            type="date"
            value={form.datum}
            onChange={(e) => set("datum", e.target.value)}
            style={{ width: 160, flexShrink: 0 }}
          />
          <input
            placeholder="Upiši što se dogodilo, npr. Podnesena tužba..."
            value={form.tekst}
            onChange={(e) => set("tekst", e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn-primary" onClick={add} disabled={loading || !form.datum || !form.tekst.trim()}>
            + Dodaj
          </button>
        </div>

        {/* Timeline */}
        {sorted.length === 0 ? (
          <div className="empty"><div className="empty-icon">📜</div><p>Nema unosa. Dodaj prvi događaj u tijeku predmeta.</p></div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Vertikalna linija */}
            <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "var(--cream)" }} />

            {sorted.map((u, i) => {
              const d = new Date(u.datum);
              const jeZadnji = i === sorted.length - 1;
              return (
                <div key={u.id} style={{ position: "relative", marginBottom: jeZadnji ? 0 : 24 }}>
                  {/* Dot na liniji */}
                  <div style={{
                    position: "absolute", left: -24, top: 4,
                    width: 12, height: 12, borderRadius: "50%",
                    background: jeZadnji ? "var(--gold)" : "var(--cream)",
                    border: `2px solid ${jeZadnji ? "var(--gold)" : "var(--ink-3)"}`,
                  }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>
                        {d.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.5 }}>{u.tekst}</div>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ flexShrink: 0 }} onClick={() => del(u.id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────
export default function PredmetPage({ predmetId, onBack, onSelectKlijent }) {
  const [predmet, setPredmet] = useState(null);
  const [tab, setTab] = useState("naslovnica");

  const load = () => api.getPredmet(predmetId).then(setPredmet);
  useEffect(() => { load(); }, [predmetId]);

  if (!predmet) return <div style={{ padding: 40, color: "var(--ink-3)" }}>Učitavanje...</div>;

  const isSporni   = SPORNI_VRSTE.includes(predmet.vrsta);
  const isNesporni = NESPORNI_VRSTE.includes(predmet.vrsta);

  const handleUpdate = async (data) => {
    await api.updatePredmet(predmet.id, data);
    load();
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Svi predmeti</button>

      <div className="predmet-header">
        <div className="predmet-oznaka">{predmet.oznaka}</div>
        <div className="predmet-stranke">
          {isSporni ? (
            <>
              <strong>{predmet.tuzitelj.ime}</strong>
              <span style={{ color: "rgba(255,255,255,.4)", margin: "0 10px" }}>vs.</span>
              <strong>{predmet.tuzeni.ime}</strong>
            </>
          ) : (
            <strong>{predmet.tuzitelj.ime}</strong>
          )}
        </div>
        <div className="predmet-meta">
          {isSporni && predmet.poslovniBroj && <div className="predmet-meta-item">Posl. broj<span>{predmet.poslovniBroj}</span></div>}
          {predmet.klijent && (
            <div className="predmet-meta-item">
              Klijent
              <span>
                <button
                  onClick={() => onSelectKlijent?.(predmet.klijent.id)}
                  style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "inherit", fontWeight: 600, padding: 0, textDecoration: "underline" }}
                >
                  {predmet.klijent.naziv}
                </button>
              </span>
            </div>
          )}
          {(isSporni || isNesporni) && predmet.sud && <div className="predmet-meta-item">Sud<span>{predmet.sud}</span></div>}
          {isSporni && predmet.sudac && <div className="predmet-meta-item">Sudac<span>{predmet.sudac}</span></div>}
          {isSporni && predmet.vps && <div className="predmet-meta-item">VPS<span>{predmet.vps}</span></div>}
          <div className="predmet-meta-item">Otvoreno<span>{formatDatum(predmet.datumOtvaranja)}</span></div>
          <div className="predmet-meta-item">Status<span style={{ textTransform: "capitalize" }}>{predmet.status}</span></div>
        </div>
      </div>

      <div className="tabs">
        {[["naslovnica","📋 Naslovnica"], ["rokovnik","📅 Rokovnik"], ["dokumenti","📂 Dokumenti"], ["tijek","📜 Tijek"]].map(([k, label]) => (
          <button key={k} className={`tab-btn${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "naslovnica" && <Naslovnica predmet={predmet} onUpdate={handleUpdate} onSelectKlijent={onSelectKlijent} />}
      {tab === "rokovnik"   && <Rokovnik predmet={predmet} onRefresh={load} />}
      {tab === "dokumenti"  && <Dokumenti predmet={predmet} onRefresh={load} />}
      {tab === "tijek"      && <Tijek predmet={predmet} onRefresh={load} />}
    </div>
  );
}
